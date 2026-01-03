from pathlib import Path 
txt=Path('src/components/analytics/AnalyticsDashboard.tsx').read_text(encoding='utf-8') 
print('dayFilter' in txt) 
