from pathlib import Path 
t=Path('src/app/(dashboard)/routes/actions.ts').read_text(encoding='utf-8') 
print('actual_arrival_time' in t, 'actual_departure_time' in t) 
