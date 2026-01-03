from pathlib import Path 
lines=Path('src/app/(dashboard)/routes/actions.ts').read_text(encoding='utf-8').splitlines() 
for i,l in enumerate(lines,1): 
	if 'totalDurationMinutes' in l or 'completeRoute' in l: 
		print(i,l) 
