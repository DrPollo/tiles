import json
import pymongo
from pymongo import MongoClient
from bson import ObjectId
import os

dbName = 'test_tileserver'
#dbName = 'fl_v4'
#dbName = 'fl_v4'

client = MongoClient()

db = client[dbName]

def create_new_collection(collection_name):

    if(collection_name in db.collection_names()):
        db[collection_name].drop()
    
    collection = db.create_collection(collection_name)

def import_new_collection(file_name,collection_name):
    path = os.getcwd()+'/geojson/tippecanoe/'
    with open(path+file_name) as data_file:
        from_file = json.load(data_file)

    if(collection_name in db.collection_names()):
        db[collection_name].drop()

    if(len(from_file) > 0):
        collection = db.create_collection(collection_name)
        for id_a in from_file:
		uuid = id_a["properties"]["id"]
		id_a["_id"] = uuid
		#print("import",uuid)
		collection.insert(id_a)

def append_new_collection(file_name,collection_name):
    path = os.getcwd()+'/geojson/tippecanoe/'
    #print(os.getcwd()+'/geojson/tippecanoe/'+file_name)
    with open(path+file_name) as data_file:
        from_file = json.load(data_file)

    if(collection_name in db.collection_names()):
        if(len(from_file) > 0):
        	for id_a in from_file:
        	    print(id_a["properties"])
			    uuid = id_a["properties"]["id"]
			    id_a["_id"] = uuid
			    #print("append",uuid)
	    		db[collection_name].insert(id_a)
    else:
        import_new_collection(file_name,collection_name)

def set_ID():

    allRowAreas = db.allRowAreas.find()
    create_new_collection('AllAreas')
    
    for id_a in allRowAreas:
    	uuid = id_a["properties"]["id"]
    	id_a["_id"] = uuid
    	
    	db.AllAreas.insert(id_a)
    	
    db.AllAreas.update({}, { "$unset": {"properties.id": 1, "tippecanoe": 1} }, upsert=False, multi=True)

def main():
	path = os.getcwd()+'/geojson/tippecanoe/'

	files = os.listdir(path)
	allRowAreas = [i for i in files if i.endswith('.geojson')]
	#print(allRowAreas)
	
	db['allRowAreas'].drop()

	for area in allRowAreas:
		print(area)
		append_new_collection(area,'allRowAreas')
		
	set_ID()
	
	#mongoexport --db fl_V4 --collection AllAreas --out AllAreas.json
	


if __name__ == "__main__":
    main()
