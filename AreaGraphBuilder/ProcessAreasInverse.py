from sys import exit

from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.objectid import InvalidId
from pymongo.errors import OperationFailure

from neo4j.v1 import GraphDatabase

import json
import datetime

# PARAMETERS
NEO4J_URL="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PWD="firstlife2014"

MONGO_URL='mongodb://localhost:27017/'
MONGO_DB="test"
MONGO_COLLECTION="areas"
# END PARAMETERS


uri = NEO4J_URL
driver = GraphDatabase.driver(uri, auth=(NEO4J_USER, NEO4J_PWD))
session = driver.session()

client = MongoClient(MONGO_URL)
db = client[MONGO_DB]
collection = db[MONGO_COLLECTION]

fErrors=open("errors.log","w")
fSkip=open("edgeSkip.log","w")
fEdge=open("edges.log","w")


def log(handler,message):
    handler.write(("["+str(datetime.datetime.utcnow())+"] "+message).encode('ascii', 'ignore'))

def clearGraph():
    session.run("MATCH (n)-[r]->(n2) DELETE r")
    session.run("MATCH (n) DELETE n")

def addNodeArea(area):
    # rst = session.run("MERGE (a:Areas {areaId:$areaId}) RETURN id(a)", areaId=area["_id"])
    rst = session.run(
        "CREATE (a:Areas) SET a.name=$name, a.areaId=$areaId, a.z_index=$zIndex, a.geojson=$geojson RETURN id(a)",
        geojson=json.dumps(area), zIndex=area["properties"]["z_index"],
        name=area["properties"]["name"], areaId=area["_id"])
    rstId = rst.single()[0]
    return rstId


def addEdgeAreas(container, content, relation):
    query = "match (container:Areas {areaId:$areaContainer}), (content:Areas {areaId:$areaContent}) CREATE (content)-[r:"+relation+"]->(container) return id(r)"

    rst = session.run(query, areaContainer=container["_id"], areaContent=content["_id"])
    rstId = rst.single()[0]
    # print("created relationship " + str(rstId))
    return rstId


def getAllAreas(z_index):
    areas = []
    for area in collection.find({"properties.z_index": z_index}):
        areas.append(area)
    return areas


def createNodes():
    i = 1
    for zIndex in range(1, 22):
        for area in collection.find({"properties.z_index": zIndex}):
            neo4jId = addNodeArea(area)
            print(str(i) + ' Node created: ' + str(neo4jId) + ' - ' + area['_id'] + ' - ' + unicode(
                area['properties']['name']) + " - " + str(
                area["properties"]['z_index']) + "]")
            i = i + 1


def rebuildWithFather():
    rst=[]

    print("Retrieving nodes with father...")

    result = session.run("match (content:Areas)-[:PART_OF]->(container:Areas) return content.areaId as areaId")

    for record in result:
        rst.append(record["areaId"])

    print("ok ("+str(len(rst))+" nodes)")

    return rst

def computeEdges():
    containerIdx = 1

    withFather = [] # id mantenuti in locale, per le performance

    #withFather = rebuildWithFather()

    for z_index in range(22,0,-1):

        containers = getAllAreas(z_index)

        for container in containers:

            containerStr = container['_id'] + " [" + str(container["properties"]['z_index']) + "] - " + unicode(
                container['properties']['name'])

            print(str(containerIdx) + ' Examining: ' + containerStr)

            containerIdx = containerIdx + 1

            zIndex = container["properties"]["z_index"]

            try:
                j = 1
                contents = []
                for content in collection.find({"properties.z_index": {"$gt": zIndex},"geometry": {"$geoWithin": {"$geometry": container["geometry"]}}}).sort("properties.z_index", 1):
                #for content in collection.find({"properties.z_index": {"$gt": zIndex},"geometry": {"$geoIntersects": {"$geometry": container["geometry"]}}}).sort("properties.z_index", 1):

                    contents.append(content)

                for content in contents:

                    contentStr = content['_id'] + " [" + str(content["properties"]['z_index']) + "] - " + unicode(
                        content['properties']['name'])

                    try:
                        withFather.index(content["_id"])
                        print("SKIP " + str(j) + " (" + contentStr + ") --> (" + containerStr + ")")
                        log(fSkip,"SKIP " + str(j) + " (" + contentStr + ") --> (" + containerStr + ")"+"n")
                    except ValueError, e:
                        addEdgeAreas(container, content, "INTERSECTS")
                        print(str(j) + " (" + contentStr + ") --> (" + containerStr + ")")
                        log(fEdge,str(j) + " (" + contentStr + ") --> (" + containerStr + ")")
                        j = j + 1
                        withFather.append(content["_id"])

                print("\n")

            except OperationFailure, e:
                print("ECCEZIONE (id area: "+container["_id"]+"): " + str(e))
                log(fErrors,"ECCEZIONE ("+container["_id"]+"): " + str(e)+"\n")


#############################

clearGraph()

createNodes()

computeEdges()

fErrors.close()
fSkip.close()
