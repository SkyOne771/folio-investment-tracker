export function chartScale(values,{includeZero=false}={}){
 const finite=values.filter(Number.isFinite);let low=finite.length?Math.min(...finite):0,high=finite.length?Math.max(...finite):1;
 if(includeZero){low=Math.min(0,low);high=Math.max(0,high);}
 if(low===high){const pad=Math.max(Math.abs(low)*.01,1);low-=pad;high+=pad;}
 const raw=(high-low)/4,power=10**Math.floor(Math.log10(raw)),step=([1,2,2.5,5,10].find(n=>n*power>=raw)||10)*power;
 low=Math.floor(low/step)*step;high=Math.ceil(high/step)*step;
 const ticks=[];for(let i=0;i<=Math.round((high-low)/step);i++)ticks.push(Number((low+i*step).toPrecision(12)));
 return {low,high,step,ticks,y:value=>190-(value-low)/(high-low)*165};
}

export function hourlyTicks(start,end,timeZone='Europe/Warsaw'){
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return [];
 const format=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit'}),ticks=[];
 for(let time=Math.ceil(start/3600000)*3600000;time<=end;time+=3600000)ticks.push({time,label:format.format(time),position:end===start?50:(20+(time-start)/(end-start)*660)/700*100});
 if(!ticks.length){ticks.push({time:start,label:format.format(start),position:end===start?50:20/700*100});if(end>start)ticks.push({time:end,label:format.format(end),position:680/700*100});}
 return ticks;
}
