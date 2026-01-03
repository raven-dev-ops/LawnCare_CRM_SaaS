from pathlib import Path 
text=Path('src/types/database.types.ts').read_text(encoding='utf-8') 
start=text.index('total_duration_minutes') 
print(text[start:start+120]) 
