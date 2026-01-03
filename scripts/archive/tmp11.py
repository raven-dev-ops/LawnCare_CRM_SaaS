from pathlib import Path 
lines=Path('src/app/(dashboard)/routes/actions.ts').read_text(encoding='utf-8').splitlines() 
for i,l in enumerate(lines,1): 
	if 'completeRoute' in l or 'endTime' in l or 'UpdateRouteStatusInput' in l: 
		print(f'{i}: '+l) 
