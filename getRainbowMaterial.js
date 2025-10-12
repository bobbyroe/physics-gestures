import * as THREE from 'three';
import { floor, Fn, max, min, positionLocal, sub, time, vec3 } from 'three/tsl';

const hslHelper = Fn( ([ h, s, l, n ])=>{
	var k = n.add( h.mul( 12 ) ).mod( 12 );
	var a = s.mul( min( l, sub( 1, l ) ) );
	return l.sub( a.mul( max( -1, min( min( k.sub( 3 ), sub( 9, k ) ), 1 ) ) ) );
});

const hsl = Fn( ([ h, s, l ]) => {
	h = h.fract().add( 1 ).fract();
	s = s.clamp( 0, 1 );
	l = l.clamp( 0, 1 );
	var r = hslHelper( h, s, l, 0 );
	var g = hslHelper( h, s, l, 8 );
	var b = hslHelper( h, s, l, 4 );
	return vec3( r, g, b );
});

function fragNode () {
  const t = 0; // time.mul(0.2).fract();
  const p = positionLocal.x.add(0.3).sub(t);
  const hue = floor(p.mul(10)).mul(0.1);
  const sat = hue.mod(1).oneMinus().mul(0.5);
  const col = hsl(hue, 1, sat);
  return col;
}


const mat = new THREE.NodeMaterial();
mat.wireframe = true;
mat.fragmentNode = fragNode();

function getRainbowMaterial() {
  return mat;
}

export default getRainbowMaterial;