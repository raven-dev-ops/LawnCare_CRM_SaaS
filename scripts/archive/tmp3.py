from pathlib import Path 
lines=Path('src/components/routes/RouteDetailView.tsx').read_text(encoding='utf-8').splitlines() 
for i,l in enumerate(lines,1): 
	if 'RouteDetailView' in l or 'useState' in l or 'route_stops' in l: 
		print(f'{i}: '+l) 
