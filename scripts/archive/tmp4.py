from pathlib import Path 
lines=Path('src/components/routes/RouteDetailView.tsx').read_text(encoding='utf-8').splitlines() 
start=60;end=120 
for i in range(start,end): 
	print(f'{i+1:03d}: '+lines[i]) 
