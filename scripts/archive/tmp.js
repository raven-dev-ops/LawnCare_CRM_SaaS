const fs=require('fs');const t=fs.readFileSync('src/types/database.types.ts','utf8');const i=t.indexOf('route_statistics');console.log(t.slice(i,i+800));  
