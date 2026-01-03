from pathlib import Path 
text=Path('src/types/database.types.ts').read_text(encoding='utf-8') 
start=text.index('routes: {') 
print(text[start:start+500]) 
