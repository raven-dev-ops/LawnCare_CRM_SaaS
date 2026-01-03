from pathlib import Path 
lines=Path('src/components/routes/RouteDetailView.tsx').read_text(encoding='utf-8').splitlines() 
for i,l in enumerate(lines,1): 
	if 'Total Distance' in l or 'Estimated Time' in l or 'Fuel Cost' in l or 'Total Revenue' in l or 'Total Stops' in l: 
		print(f'{i}: '+l) 
