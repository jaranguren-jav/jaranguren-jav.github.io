import * as THREE from "three"
import React, { Suspense, useEffect, useRef, useState } from "react"
import { useLoader, useFrame } from "react-three-fiber"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { moveHead, access_granted } from "../utils"
import Loading from "./Loading"
import Effects from "./Effects"

export default function Head({ mouse, ...props }) {
    //Group definitions
    const scene = useRef()
    const head = useRef()
    const head_cut = useRef()
    const brain = useRef()
    // Gltf Model and font loading hooks
      const { nodes, animations } = useLoader(GLTFLoader, "./assets/head.gltf")
    const font = useLoader(THREE.FontLoader, "./assets/fonts/roboto_mono_bold.json")
    let wireframe_alpha = useLoader(THREE.TextureLoader, "./assets/wireframe_alpha.png")
    let head_alpha = useLoader(THREE.TextureLoader, "./assets/head_alpha.png")
    const [animationGlitch, setAnimatioGlitch] = useState(false);
    const [accessGranted, setAccessGranted] = useState(false);
    const [mousePos, setMousePos] = useState({x:0,y:0});
    const updateMousePosition = ev => {setMousePos({ x: ev.clientX, y: ev.clientY });};

    //Materials
    const cutline_material = new THREE.MeshLambertMaterial({color:0x8293a,emissive:0xa6edf2, transparent: true});
    props.cutlineHovered  ? cutline_material.setValues({opacity: 1}) : cutline_material.setValues({opacity: 0.05})
    const invisible_material = new THREE.MeshLambertMaterial({color: 0x000000, transparent: true, opacity: 0});
    const brain_hovered = new THREE.MeshLambertMaterial({color:0x8293a,emissive:0xa6edf2,wireframe:true,})
    const brain_mat = new THREE.MeshBasicMaterial({color:0x39898f,wireframe:true})
    const brain_int_mat = new THREE.MeshLambertMaterial({color: 0x3149, transparent: true, opacity: 0.75});
    nodes["head_mesh"].material.setValues({transparent: true,alphaMap:head_alpha})
    let head_mat = nodes["head_mesh"].material
    const head_wireframe = new THREE.MeshLambertMaterial({color:0x6cbbe2,emissive:0xa6edf2,wireframe:true,transparent: true,opacity: 0.15,alphaMap:wireframe_alpha})

    //Animation mixer definition
    const [mixer] = useState(() => new THREE.AnimationMixer())

    useFrame((state, delta) => {
      //If "Brain Mode" activated, rotate the Brain
      if(props.brainMode){
        if(props.brainHover === "no_hover"){brain.current.children.map(item => item.rotation.y = item.rotation.y -= 0.015)} 
      //Else if the cutline is clicked make the cutline dissapear and activate the main animation 
      } else if(props.isHeadGlued){
        setAnimatioGlitch(true)
        setAccessGranted(true)
        head.current.children[0].visible = true
        head.current.children[1].visible = true
        head.current.children[2].visible = true
        head.current.children[3].visible = true
        head.current.children[4].visible = false
        head.current.children[5].visible = false
        head_cut.current.visible = true
        if(props.brainHover === "no_hover"){brain.current.children.map(item => item.rotation.y = 0)} 
        mixer._actions.forEach((clip) => {
          clip.paused = false;
          clip.setLoop(THREE.LoopOnce);      
          clip.timeScale = -1;
          clip.clampWhenFinished = true;
          clip.play();
        }) 
        mixer.update(delta)
      //Else show everything and keep the moving head animation
      } else if(props.isHeadCut){
        setAnimatioGlitch(true)
        setAccessGranted(true)
        head.current.children[4].visible = false
        head.current.children[5].visible = false
        head_cut.current.visible = true
        brain.current.visible = true
        //Setting the animations propierties
        mixer._actions.forEach((clip) => {
          clip.paused = false;
          clip.setLoop(THREE.LoopOnce)
          clip.timeScale = 1;
          clip.clampWhenFinished = true;
          clip.play()
        })
        mixer.update(delta)
      //Else show everything and keep the moving head animation
      } else {
        props.cutlineHovered  ? setAnimatioGlitch(true) : setAnimatioGlitch(false) 
        head_cut.current.visible = false
        brain.current.visible = false
        head.current.children.map(item => item.visible = true)
        moveHead(mousePos, head.current)
        moveHead(mousePos, head_cut.current)
      }
    })

    useEffect(() => {
      //Get mouse position
      window.addEventListener("mousemove", updateMousePosition);
      //Set every animation to it's corresponding root object
      var actions = [
        mixer.clipAction(animations[0], head.current.children[0]),
        mixer.clipAction(animations[1], head.current.children[2]),
        mixer.clipAction(animations[2], head_cut.current.children[1]),
        mixer.clipAction(animations[3], head.current.children[1]),
        mixer.clipAction(animations[4], head.current.children[3]),
        mixer.clipAction(animations[5], head_cut.current.children[0]),
        mixer.clipAction(animations[6], brain.current.children[4]),
        mixer.clipAction(animations[7], brain.current.children[1]),
        mixer.clipAction(animations[8], brain.current.children[2]),
        mixer.clipAction(animations[9], brain.current.children[0]),
        mixer.clipAction(animations[10], brain.current.children[3]),
        mixer.clipAction(animations[11], brain.current.children[5])
      ];
      //When the action is finished it switch to the "Brain Mode"
      mixer.addEventListener('finished',() =>{ 
        props.animationFinish()
        setAnimatioGlitch(false)
        setAccessGranted(false)
      })
      //Finally all the clips are uncached
      return () => actions.forEach(clip => mixer.uncacheClip(clip))
    }, [])

    return (
      <group ref={scene} {...props} dispose={null} >
        <Suspense fallback={<Loading/>}>
          <group ref={head} {...props} dispose={null} >
            <mesh geometry={nodes["eye_left"].geometry} material={nodes["eye_left"].material} position={nodes["eye_left"].position} />
            <mesh geometry={nodes["eye_left_lid"].geometry} material={nodes["eye_left_lid"].material} position={nodes["eye_left_lid"].position}/>
            <mesh geometry={nodes["eye_right"].geometry} material={nodes["eye_right"].material} position={nodes["eye_right"].position}/>
            <mesh geometry={nodes["eye_right_lid"].geometry} material={nodes["eye_right_lid"].material} position={nodes["eye_right_lid"].position}/>
            <mesh geometry={nodes["head_mesh"].geometry} material={head_mat} position={nodes["head_mesh"].position}>
                <mesh geometry={nodes["head_mesh"].geometry} material={head_wireframe} position={nodes["head_mesh"].position}></mesh>
            </mesh>
            <mesh geometry={nodes["cutline"].geometry} material={cutline_material} position={nodes["cutline"].position}/>
            {!props.brainMode & !props.isHeadGlued? 
             <mesh geometry={nodes["cutline_hoverzone"].geometry} material={invisible_material} position={nodes["cutline_hoverzone"].position}
             onPointerOver={e => {props.setCutlineHovered(e);e.stopPropagation()}}
             onPointerOut={e => {props.setCutlineHovered(e);e.stopPropagation()}}
             onClick={props.setCutHead}
             />
            : ""}
          </group>
        </Suspense>
        <Suspense fallback={<Loading/>}>
          <group ref={head_cut} {...props} dispose={null} >
            <mesh geometry={nodes["head_mesh_up"].geometry} material={head_mat} position={nodes["head_mesh_up"].position}>
                <mesh geometry={nodes["head_mesh_up"].geometry} material={head_wireframe} position={nodes["head_mesh_up"].position}/>
            </mesh>
            <mesh geometry={nodes["head_mesh_down"].geometry} material={head_mat} position={nodes["head_mesh_down"].position}>
                  <mesh geometry={nodes["head_mesh_down"].geometry} material={head_wireframe} position={nodes["head_mesh_down"].position}/>
            </mesh>
          </group>
        </Suspense>
        <Suspense fallback={<Loading/>}>
          <group ref={brain} {...props} dispose={null} >
            <mesh visible geometry={nodes["brain_ux"].geometry} material={props.brainHover === "UX / UI" ? brain_hovered : brain_mat} position={nodes["brain_ux"].position}
              onPointerMove={e => {if(props.brainMode) props.setBrainHover(e, "UX / UI");e.stopPropagation()}} 
              onPointerOut={e => {props.setBrainHover(e,"no_hover");e.stopPropagation()}}
              onClick={e=>{if(props.brainMode) props.newWindow("UX / UI");e.stopPropagation()}}
              />              
            <mesh visible geometry={nodes["brain_frontend"].geometry} material={props.brainHover === "FRONT-END DEVELOPER" ? brain_hovered : brain_mat} position={nodes["brain_frontend"].position}
              onPointerMove={e => {if(props.brainMode)  props.setBrainHover(e,"FRONT-END DEVELOPER");e.stopPropagation()}}
              onPointerOut={e => {props.setBrainHover(e,"no_hover");e.stopPropagation()}}
              onClick={e=>{if(props.brainMode) props.newWindow("FRONT-END DEVELOPER");e.stopPropagation()}}
              />   
            <mesh visible geometry={nodes["brain_graphic"].geometry} material={props.brainHover === "GRAPHIC DESIGN" ? brain_hovered : brain_mat} position={nodes["brain_graphic"].position}
              onPointerMove={e => {if(props.brainMode) props.setBrainHover(e,"GRAPHIC DESIGN");e.stopPropagation()}}
              onPointerOut={e => {props.setBrainHover(e,"no_hover");e.stopPropagation()}}
              onClick={e=>{if(props.brainMode) props.newWindow("GRAPHIC DESIGN");e.stopPropagation()}}
              />   
            <mesh visible geometry={nodes["brain_3d"].geometry} material={props.brainHover === "VISUAL ARTIST" ? brain_hovered : brain_mat} position={nodes["brain_3d"].position}
              onPointerMove={e => {if(props.brainMode) props.setBrainHover(e,"VISUAL ARTIST");e.stopPropagation()}}
              onPointerOut={e => {props.setBrainHover(e, "no_hover");e.stopPropagation()}}
              onClick={e=>{if(props.brainMode) props.newWindow("VISUAL ARTIST");e.stopPropagation()}}
              />   
            <mesh visible geometry={nodes["brain_aboutMe"].geometry} material={props.brainHover === "ABOUT ME" ? brain_hovered : brain_mat} position={nodes["brain_aboutMe"].position}
              onPointerMove={e => {if(props.brainMode) props.setBrainHover(e,"ABOUT ME");e.stopPropagation()}}
              onPointerOut={e => {props.setBrainHover(e,"no_hover");e.stopPropagation()}}
              onClick={e=>{if(props.brainMode) props.newWindow("ABOUT ME");e.stopPropagation()}}
              />   
            <mesh visible geometry={nodes["brain_interior"].geometry} material={brain_int_mat} position={nodes["brain_interior"].position}/>
          </group>
        </Suspense>
        {accessGranted && props.isHeadCut ? access_granted(font,true) : accessGranted && props.isHeadGlued? access_granted(font,false) : ""}
        <Effects animationGlitch={animationGlitch} glitchIntensity={props.cutlineHovered  ? 0.005 : 0.05} bloomLvl={0.4}/> 
      </group>
    )
}