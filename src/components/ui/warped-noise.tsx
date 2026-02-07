import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface WarpedNoiseShadersProps extends React.HTMLAttributes<HTMLCanvasElement> {
  speed?: number;
  scale?: number;
  warpStrength?: number;
  colorIntensity?: number;
  noiseDetail?: number;
}

const VERT = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform float u_speed;
uniform float u_scale;
uniform float u_warpStrength;
uniform float u_colorIntensity;
uniform float u_noiseDetail;

vec4 colormap(float x) {
    vec3 c0 = vec3(20.0, 100.0, 40.0) / 255.0;
    vec3 c1 = vec3(0.0, 160.0, 140.0) / 255.0;
    vec3 c2 = vec3(0.0, 80.0, 180.0) / 255.0;
    vec3 c3 = vec3(30.0, 60.0, 200.0) / 255.0;
    vec3 col;
    if (x < 0.33) { col = mix(c0, c1, x / 0.33); }
    else if (x < 0.66) { col = mix(c1, c2, (x - 0.33) / 0.33); }
    else { col = mix(c2, c3, (x - 0.66) / 0.34); }
    return vec4(col, 1.0);
}

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

float fbm(vec2 p) {
    mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);
    float f = 0.0;
    f += 0.500000 * noise(p + iTime * u_speed); p = mtx * p * 2.02;
    f += 0.031250 * noise(p); p = mtx * p * 2.01;
    f += 0.250000 * noise(p); p = mtx * p * 2.03;
    f += 0.125000 * noise(p); p = mtx * p * 2.01;
    f += 0.062500 * noise(p); p = mtx * p * 2.04;
    f += 0.015625 * noise(p + sin(iTime * u_speed));
    return f / 0.96875;
}

float pattern(vec2 p) {
    return fbm(p + fbm(p + fbm(p)) * u_warpStrength);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.x * u_scale;
    float shade = pattern(uv * u_noiseDetail);
    vec4 color = colormap(shade);
    color.rgb *= u_colorIntensity;
    gl_FragColor = vec4(color.rgb, shade);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function WarpedNoiseShaders({
  className,
  speed = 1.0,
  scale = 1.0,
  warpStrength = 1.0,
  colorIntensity = 1.0,
  noiseDetail = 1.0,
  ...props
}: WarpedNoiseShadersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "iTime");
    const uRes = gl.getUniformLocation(program, "iResolution");
    const uSpeed = gl.getUniformLocation(program, "u_speed");
    const uScale = gl.getUniformLocation(program, "u_scale");
    const uWarp = gl.getUniformLocation(program, "u_warpStrength");
    const uColor = gl.getUniformLocation(program, "u_colorIntensity");
    const uDetail = gl.getUniformLocation(program, "u_noiseDetail");

    gl.uniform1f(uSpeed, speed);
    gl.uniform1f(uScale, scale);
    gl.uniform1f(uWarp, warpStrength);
    gl.uniform1f(uColor, colorIntensity);
    gl.uniform1f(uDetail, noiseDetail);

    let animId: number;
    const start = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      resize();
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animId);
  }, [speed, scale, warpStrength, colorIntensity, noiseDetail]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block h-full w-full", className)}
      {...props}
    />
  );
}

export default WarpedNoiseShaders;
