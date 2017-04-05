from subprocess import call
import os
import json

def main():

	osm_levels = ['4','6','8','10','13','14','16','18']

	with open('tilemap.json') as data_file:
		allThings = json.load(data_file)

	for num_level in osm_levels:

		geoFile = 'level_'+num_level+'.geojson'

		for l in allThings:
			
			if(l['tiles'][0] == geoFile):
			# --maximum-zoom=zoom: 
			# Maxzoom: the highest zoom level for which tiles are generated (default 14)
				maxZ = str(l['maxzoom'])

			# --minimum-zoom=zoom: 
			# Minzoom: the lowest zoom level for which tiles are generated (default 0)
				minZ = str(l['minzoom'])

				comm = 'tippecanoe --output mbtilesTIPPECANOE_level_'+num_level+'.mbtiles --force --minimum-zoom='+minZ+' --maximum-zoom='+maxZ+' TIPPECANOE_'+geoFile

				print comm
				os.system(comm)

if __name__ == "__main__":
    main()
