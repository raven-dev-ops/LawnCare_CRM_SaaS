from pathlib import Path 
lines=Path('src/app/(dashboard)/routes/actions.ts').read_text(encoding='utf-8').splitlines() 
start=120;end=240 
for i in range(start,end): 
	print(f'{i+1:03d}: '+lines[i]) 
