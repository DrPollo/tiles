import json
import string

def creaGeojsonThings(num_level):

	features = {}

	with open('level_'+num_level+'.geojson') as data_file:
		allThings = json.load(data_file)

	with open('tilemap.json') as tilemap_file:
		tilemap = json.load(tilemap_file)

	for l in tilemap:
		
		if(l['tiles'][0] == 'level_'+num_level+'.geojson'):
		# --maximum-zoom=zoom: 
		# Maxzoom: the highest zoom level for which tiles are generated (default 14)
			zoom_max = l['maxzoom']

		# --minimum-zoom=zoom: 
		# Minzoom: the lowest zoom level for which tiles are generated (default 0)
			zoom_min = l['minzoom']
			
	features["type"] = "FeatureCollection"
	features["features"] = []
	#features = []

	for i in allThings["features"]:
		one_feature = i

		if ("bbox" in i['properties']):
			del one_feature["properties"]["bbox"]

		if ("geometry" in i['properties']):
			del one_feature["properties"]["geometry"]
		
		one_feature["properties"]["zoom_max"] = zoom_max
		one_feature["properties"]["zoom_min"] = zoom_min

		# "tippecanoe" : { "maxzoom" : 9, "minzoom" : 4,"layer" : "interactive"}
		# appear in the vector tiles for zoom levels 4 through 9
		# --layer=name: Layer name
		one_feature["tippecanoe"] = {"maxzoom" : zoom_max, "minzoom" : zoom_min,"layer" : "interactive"}

		features["features"].append(json.loads(json.dumps(one_feature)))

	with open('TIPPECANOE_level_'+num_level+'.geojson', "w") as geoJson:
		geoJson.write(json.dumps(features))
	geoJson.close()


def main():

	osm_levels = ['4','6','8','10','13','14','16','18']
	for num_level in osm_levels:
		print (num_level)
		creaGeojsonThings(num_level)


if __name__ == "__main__":
    main()
