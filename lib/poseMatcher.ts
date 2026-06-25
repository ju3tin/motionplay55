export interface Keypoint{

x:number;

y:number;

score?:number;

}




const ANGLES = [

[5,7,9],

[6,8,10],

[11,13,15],

[12,14,16],

[5,11,13],

[6,12,14],

[5,11,12],

[6,12,11]

];




function angle(
a:number[],
b:number[],
c:number[]
){

const ab={

x:a[0]-b[0],

y:a[1]-b[1]

};


const cb={

x:c[0]-b[0],

y:c[1]-b[1]

};



const dot=

ab.x*cb.x+

ab.y*cb.y;



const mag=

Math.sqrt(
ab.x**2+
ab.y**2
)
*
Math.sqrt(
cb.x**2+
cb.y**2
);



if(!mag)
return 0;



return Math.acos(dot/mag)
*180/Math.PI;


}






function normalise(points:number[][]){


let cx=0;

let cy=0;



points.forEach(p=>{

cx+=p[0];

cy+=p[1];

});



cx/=points.length;

cy/=points.length;



return points.map(p=>[

p[0]-cx,

p[1]-cy

]);


}







export function calculatePoseScore(

player:Keypoint[],

target:number[][]

){



if(
player.length!==17
)
return 0;




const p = normalise(

player.map(k=>[

k.x,

k.y

])

);



const t = normalise(target);





let total=0;

let count=0;



ANGLES.forEach(([a,b,c])=>{


const pa=

angle(
p[a],
p[b],
p[c]
);


const ta=

angle(
t[a],
t[b],
t[c]
);



const diff=

Math.abs(pa-ta);



total +=

Math.max(
0,
100-diff
);



count++;


});



return Math.round(

total/count

);


}
