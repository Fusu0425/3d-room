import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, RoundedBox, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { books, getRoomItem } from '../data/roomContent'

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`

const HOME_VIEWS = {
  desktop: {
    camera: new THREE.Vector3(5.62, 3.65, 6.15),
    target: new THREE.Vector3(0.34, 1.34, -0.78),
    fov: 37,
  },
  compactLandscape: {
    camera: new THREE.Vector3(7.2, 4.15, 8.05),
    target: new THREE.Vector3(0.34, 1.35, -0.78),
    fov: 42,
  },
  compactPortrait: {
    camera: new THREE.Vector3(13.8, 7.45, 16.1),
    target: new THREE.Vector3(0.34, 1.38, -0.82),
    fov: 52,
  },
}

function getHomeView(width, height) {
  if (width <= 720 && height > width) return HOME_VIEWS.compactPortrait
  if (width <= 900) return HOME_VIEWS.compactLandscape
  return HOME_VIEWS.desktop
}

function useCompactViewport() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 720px), (pointer: coarse)').matches)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 720px), (pointer: coarse)')
    const update = () => setCompact(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return compact
}

function getInitialMobileQuality() {
  try {
    if (window.sessionStorage.getItem('room-mobile-quality') === 'low') return 'low'
  } catch { /* Performance preference can remain session-only. */ }
  const userAgent = navigator.userAgent || ''
  const constrainedWebView = /MicroMessenger|HuaweiBrowser|HUAWEI|HarmonyOS|HMSCore|TLR-[A-Z0-9]+/i.test(userAgent)
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory
  return constrainedWebView || cores <= 4 || (Number.isFinite(memory) && memory <= 4) ? 'low' : 'balanced'
}

function StudioEnvironment() {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, 0.035).texture
    const previousEnvironment = scene.environment
    const previousIntensity = scene.environmentIntensity
    scene.environment = environment
    scene.environmentIntensity = 0.48

    return () => {
      scene.environment = previousEnvironment
      scene.environmentIntensity = previousIntensity
      environment.dispose()
      room.clear()
      pmrem.dispose()
    }
  }, [gl, scene])

  return null
}

function CameraRig({ selectedId, resetToken, mobileQuality, onLowPerformance }) {
  const { camera, invalidate, setDpr, size } = useThree()
  const homeView = getHomeView(size.width, size.height)
  const compact = size.width <= 720
  const controls = useRef()
  const qualityTimer = useRef()
  const destination = useRef({ position: homeView.camera.clone(), target: homeView.target.clone() })
  const returnView = useRef({ position: homeView.camera.clone(), target: homeView.target.clone() })
  const lastSelected = useRef(null)
  const moving = useRef(false)
  const interacting = useRef(false)
  const frameSample = useRef({ total: 0, slow: 0 })

  const compactMotionDpr = mobileQuality === 'low' ? 0.78 : 1
  const compactIdleDpr = mobileQuality === 'low'
    ? Math.min(window.devicePixelRatio || 1, 1.15)
    : Math.min(window.devicePixelRatio || 1, 1.55)

  const useMotionQuality = () => {
    window.clearTimeout(qualityTimer.current)
    setDpr(compact ? compactMotionDpr : Math.min(window.devicePixelRatio || 1, 0.68))
  }

  const restoreQuality = () => {
    window.clearTimeout(qualityTimer.current)
    qualityTimer.current = window.setTimeout(() => {
      setDpr(compact ? compactIdleDpr : Math.min(window.devicePixelRatio || 1, 1))
      invalidate()
    }, compact ? 320 : 480)
  }

  useEffect(() => () => window.clearTimeout(qualityTimer.current), [])

  useEffect(() => {
    if (!compact) return
    setDpr(compactIdleDpr)
    invalidate()
  }, [compact, compactIdleDpr, invalidate, setDpr])

  useEffect(() => {
    camera.fov = homeView.fov
    camera.updateProjectionMatrix()
    if (!selectedId && !lastSelected.current) {
      destination.current = { position: homeView.camera.clone(), target: homeView.target.clone() }
      returnView.current = { position: homeView.camera.clone(), target: homeView.target.clone() }
      useMotionQuality()
      moving.current = true
      invalidate()
    }
  }, [camera, homeView, invalidate, selectedId])

  useEffect(() => {
    if (!controls.current) return
    if (selectedId) {
      const item = getRoomItem(selectedId)
      if (!item) return
      const itemFocus = compact && item.mobileFocus ? item.mobileFocus : item.focus
      if (!lastSelected.current) {
        returnView.current = {
          position: camera.position.clone(),
          target: controls.current.target.clone(),
        }
      }
      destination.current = {
        position: new THREE.Vector3(...itemFocus.camera),
        target: new THREE.Vector3(...itemFocus.target),
      }
      useMotionQuality()
      moving.current = true
      invalidate()
    } else if (lastSelected.current) {
      destination.current = {
        position: returnView.current.position.clone(),
        target: returnView.current.target.clone(),
      }
      useMotionQuality()
      moving.current = true
      invalidate()
    }
    lastSelected.current = selectedId
  }, [camera, compact, invalidate, selectedId])

  useEffect(() => {
    if (!controls.current) return
    destination.current = { position: homeView.camera.clone(), target: homeView.target.clone() }
    returnView.current = { position: homeView.camera.clone(), target: homeView.target.clone() }
    useMotionQuality()
    moving.current = true
    invalidate()
  }, [homeView, invalidate, resetToken])

  useFrame((_, delta) => {
    if (compact && mobileQuality !== 'low' && (moving.current || interacting.current) && delta > 0 && delta < 0.2) {
      frameSample.current.total += 1
      if (delta > 1 / 27) frameSample.current.slow += 1
      if (frameSample.current.total >= 18) {
        if (frameSample.current.slow >= 7) onLowPerformance?.()
        frameSample.current = { total: 0, slow: 0 }
      }
    }
    if (!controls.current || !moving.current) return
    controls.current.enabled = false
    const alpha = 1 - Math.exp(-delta * 7.2)
    camera.position.lerp(destination.current.position, alpha)
    controls.current.target.lerp(destination.current.target, alpha)
    controls.current.update()

    const positionDone = camera.position.distanceTo(destination.current.position) < 0.015
    const targetDone = controls.current.target.distanceTo(destination.current.target) < 0.015
    if (positionDone && targetDone) {
      camera.position.copy(destination.current.position)
      controls.current.target.copy(destination.current.target)
      controls.current.update()
      controls.current.enabled = true
      moving.current = false
      restoreQuality()
    } else {
      invalidate()
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.72}
      target={homeView.target}
      minDistance={selectedId ? (compact ? 1.15 : 2.2) : (compact ? 5.5 : 3.0)}
      maxDistance={selectedId ? (compact ? 9 : 10) : (compact ? 30 : 13)}
      minPolarAngle={0.72}
      maxPolarAngle={1.45}
      minAzimuthAngle={-0.88}
      maxAzimuthAngle={0.88}
      enablePan={false}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
      onStart={() => {
        interacting.current = true
        frameSample.current = { total: 0, slow: 0 }
        useMotionQuality()
      }}
      onEnd={() => {
        interacting.current = false
        restoreQuality()
      }}
    />
  )
}

function SceneReady({ onReady }) {
  const reported = useRef(false)

  useFrame(() => {
    if (reported.current) return
    reported.current = true
    if (typeof onReady === 'function') window.requestAnimationFrame(onReady)
  })

  return null
}

function updateRoomHoverLabel(label = '', x, y) {
  const tooltip = document.getElementById('room-hover-label')
  if (!tooltip) return
  tooltip.lastElementChild.textContent = label
  if (Number.isFinite(x) && Number.isFinite(y)) {
    tooltip.style.left = `${x}px`
    tooltip.style.top = `${y}px`
  }
  tooltip.classList.toggle('visible', Boolean(label))
}

function Interactive({ id, label, onSelect, position = [0, 0, 0], rotation = [0, 0, 0], hitbox = [1, 1, 1], labelOffset = [0, 0, 0], children }) {
  const hovered = useRef(false)
  const anchor = useRef()
  const visual = useRef()
  const animating = useRef(false)
  const labelPoint = useRef(new THREE.Vector3())
  const { camera, invalidate, size } = useThree()
  const renderedChildren = useMemo(() => typeof children === 'function' ? children(false) : children, [children])

  const setHover = (next) => {
    if (hovered.current === next) return
    hovered.current = next
    animating.current = true
    document.body.style.cursor = next ? 'pointer' : 'grab'
    updateRoomHoverLabel(next ? label : '')
    invalidate()
  }

  useEffect(() => () => {
    document.body.style.cursor = ''
    updateRoomHoverLabel('')
  }, [])

  useFrame((_, delta) => {
    if (hovered.current && anchor.current) {
      labelPoint.current.set(...labelOffset)
      anchor.current.localToWorld(labelPoint.current)
      labelPoint.current.project(camera)
      updateRoomHoverLabel(
        label,
        (labelPoint.current.x * 0.5 + 0.5) * size.width,
        (-labelPoint.current.y * 0.5 + 0.5) * size.height,
      )
    }
    if (!visual.current || !animating.current) return
    const target = hovered.current ? 1.014 : 1
    const next = THREE.MathUtils.damp(visual.current.scale.x, target, 16, delta)
    visual.current.scale.setScalar(next)
    if (Math.abs(next - target) < 0.0004) {
      visual.current.scale.setScalar(target)
      animating.current = false
    } else invalidate()
  })

  return (
    <group
      ref={anchor}
      position={position}
      rotation={rotation}
    >
      <group ref={visual}>{renderedChildren}</group>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          if (event.delta > 6) return
          setHover(false)
          onSelect(id)
        }}
        onPointerOver={(event) => { event.stopPropagation(); setHover(true) }}
        onPointerOut={(event) => { event.stopPropagation(); setHover(false) }}
      >
        <boxGeometry args={hitbox} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Box({ args, position, rotation, color, roughness = 0.72, metalness = 0, radius = 0.04, castShadow = true, receiveShadow = false }) {
  return (
    <RoundedBox args={args} position={position} rotation={rotation} radius={radius} smoothness={2} castShadow={castShadow} receiveShadow={receiveShadow}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </RoundedBox>
  )
}

function InstancedBoxes({ transforms, color, roughness = 0.7, metalness = 0 }) {
  const instances = useRef()

  useLayoutEffect(() => {
    if (!instances.current) return
    const helper = new THREE.Object3D()
    transforms.forEach((transform, index) => {
      helper.position.fromArray(transform.position)
      helper.rotation.fromArray(transform.rotation || [0, 0, 0])
      helper.scale.fromArray(transform.scale)
      helper.updateMatrix()
      instances.current.setMatrixAt(index, helper.matrix)
    })
    instances.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    instances.current.instanceMatrix.needsUpdate = true
    instances.current.computeBoundingBox()
    instances.current.computeBoundingSphere()
  }, [transforms])

  return (
    <instancedMesh ref={instances} args={[null, null, transforms.length]} castShadow={false} receiveShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </instancedMesh>
  )
}

function MonitorDisplay() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 560
    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, 1024, 560)
    gradient.addColorStop(0, '#10191c')
    gradient.addColorStop(1, '#071013')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1024, 560)
    context.fillStyle = '#1a292c'
    context.fillRect(0, 0, 1024, 58)
    ;['#c86b5a', '#d2a14d', '#5f977a'].forEach((color, index) => {
      context.fillStyle = color
      context.beginPath()
      context.arc(35 + index * 34, 29, 10, 0, Math.PI * 2)
      context.fill()
    })
    const lines = [
      [54, 120, 290, '#6f9788'], [54, 158, 520, '#637d84'], [92, 196, 320, '#bb8d64'],
      [92, 234, 610, '#637d84'], [92, 272, 430, '#7e6c92'], [54, 332, 720, '#637d84'],
      [92, 370, 550, '#6f9788'], [92, 408, 350, '#bb8d64'], [54, 468, 475, '#637d84'],
    ]
    lines.forEach(([x, y, width, color]) => {
      context.fillStyle = color
      context.globalAlpha = 0.76
      context.fillRect(x, y, width, 10)
    })
    context.globalAlpha = 1
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 12
    return nextTexture
  }, [])

  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={[0.2, 1.82, -0.287]}>
      <planeGeometry args={[1.16, 0.62]} />
      <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#7ca0a0" emissiveIntensity={0.18} roughness={0.22} toneMapped={false} />
    </mesh>
  )
}

function WallCard({ width, height, color = '#f5f1e9', border = '#343331', children }) {
  return (
    <group>
      <Box args={[width + 0.1, height + 0.1, 0.07]} color={border} radius={0.025} />
      <Box args={[width, height, 0.075]} position={[0, 0, 0.03]} color={color} radius={0.015} />
      {children}
    </group>
  )
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  let line = ''
  let lines = 0
  for (const character of Array.from(text || '')) {
    const candidate = line + character
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight)
      lines += 1
      line = character
      if (lines >= maxLines) return y + lines * lineHeight
    } else {
      line = candidate
    }
  }
  if (line && lines < maxLines) {
    context.fillText(line, x, y + lines * lineHeight)
    lines += 1
  }
  return y + lines * lineHeight
}

function WhiteboardArtwork({ content, compact }) {
  const [logoImage, setLogoImage] = useState(null)

  useEffect(() => {
    let active = true
    const image = new Image()
    image.onload = () => active && setLogoImage(image)
    image.src = content.logo
    return () => { active = false }
  }, [content.logo])

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    const textureScale = compact ? 4 / 3 : 2
    canvas.width = compact ? 2048 : 3072
    canvas.height = compact ? 1024 : 1536
    const context = canvas.getContext('2d')
    context.scale(textureScale, textureScale)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.fillStyle = '#fbfaf6'
    context.fillRect(0, 0, 1536, 768)
    context.fillStyle = '#6d4f82'
    context.fillRect(72, 72, 10, 96)
    context.font = '600 62px "Microsoft YaHei", sans-serif'
    context.fillText((content.title || '欢迎来到我的房间').slice(0, 18), 112, 128)
    context.fillStyle = '#a78143'
    context.fillRect(112, 156, 410, 7)

    context.fillStyle = '#37332f'
    context.font = '600 31px "Microsoft YaHei", sans-serif'
    let cursorY = drawWrappedText(context, content.lead, 112, 225, 790, 48, 2)
    context.fillStyle = '#5f5952'
    context.font = '500 23px "Microsoft YaHei", sans-serif'
    cursorY = drawWrappedText(context, content.story, 112, cursorY + 34, 790, 36, 3)

    context.strokeStyle = '#ddd6ca'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(112, cursorY + 25)
    context.lineTo(902, cursorY + 25)
    context.stroke()
    context.fillStyle = '#6d4f82'
    context.font = '600 28px "Microsoft YaHei", sans-serif'
    drawWrappedText(context, `“${content.motto || ''}”`, 112, cursorY + 72, 790, 40, 2)

    context.fillStyle = '#f1ece3'
    context.beginPath()
    context.roundRect(96, 646, 822, 98, 18)
    context.fill()
    context.fillStyle = '#665b51'
    context.font = '600 22px "Microsoft YaHei", Consolas, monospace'
    context.fillText((content.keywords || '').slice(0, 44), 116, 684)
    context.fillStyle = '#8c612b'
    context.font = '700 24px Consolas, monospace'
    context.fillText((content.signature || 'THINGS THAT MOVE ME').slice(0, 32), 116, 724)

    const logoX = 1020
    const logoY = 112
    const logoSize = 390
    context.save()
    context.beginPath()
    context.roundRect(logoX, logoY, logoSize, logoSize, 28)
    context.clip()
    context.fillStyle = '#eadbb8'
    context.fillRect(logoX, logoY, logoSize, logoSize)
    if (logoImage) {
      const crop = Math.min(logoImage.width, logoImage.height)
      const sourceX = (logoImage.width - crop) / 2
      const sourceY = (logoImage.height - crop) / 2
      context.drawImage(logoImage, sourceX, sourceY, crop, crop, logoX, logoY, logoSize, logoSize)
    }
    context.restore()
    context.strokeStyle = '#b98b42'
    context.lineWidth = 7
    context.beginPath()
    context.roundRect(logoX, logoY, logoSize, logoSize, 28)
    context.stroke()
    context.fillStyle = '#6d4f82'
    context.font = '700 22px Consolas, monospace'
    context.textAlign = 'center'
    context.fillText('MY PERSONAL MARK', logoX + logoSize / 2, 562)
    context.fillStyle = '#746b62'
    context.font = '500 18px Consolas, monospace'
    context.fillText('A ROOM MADE OF THINGS I LOVE', logoX + logoSize / 2, 604)
    context.textAlign = 'left'

    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = compact ? 4 : 16
    nextTexture.generateMipmaps = !compact
    nextTexture.minFilter = compact ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter
    nextTexture.magFilter = THREE.LinearFilter
    return nextTexture
  }, [compact, content.keywords, content.lead, content.motto, content.signature, content.story, content.title, logoImage])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0, 0, 0.085]}>
      <planeGeometry args={[1.98, 0.99]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function CanvasArtwork({ kind, title, subtitle }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = kind === 'whiteboard' ? 1024 : 1024
    canvas.height = kind === 'whiteboard' ? 512 : 1536
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)

    if (kind === 'whiteboard') {
      context.fillStyle = '#684d82'
      context.font = '600 60px "Microsoft YaHei", sans-serif'
      context.fillText('Welcome to My Room!', 58, 104)
      context.fillRect(58, 126, 570, 7)
      context.fillStyle = '#403d39'
      context.font = '400 28px Consolas, monospace'
      context.fillText('Good vibes. Clear mind.', 62, 220)
      context.fillText('Make today count.', 62, 280)

      context.strokeStyle = '#aa8039'
      context.lineWidth = 18
      context.lineCap = 'round'
      context.beginPath()
      context.arc(805, 300, 82, 0.3, Math.PI * 1.83)
      context.stroke()
      context.fillStyle = '#73528f'
      context.beginPath()
      for (let point = 0; point < 8; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 4
        const radius = point % 2 ? 27 : 54
        const x = 805 + Math.cos(angle) * radius
        const y = 300 + Math.sin(angle) * radius
        if (point === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.closePath()
      context.fill()
      context.fillStyle = '#927242'
      context.fillRect(900, 266, 64, 8)
      context.fillRect(900, 294, 45, 8)
      context.fillRect(900, 322, 28, 8)
    } else if (title === 'ELDEN RING') {
      const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#071310')
      gradient.addColorStop(0.58, '#15221a')
      gradient.addColorStop(1, '#050706')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.globalAlpha = 0.42
      context.strokeStyle = '#b88a38'
      context.lineCap = 'round'
      for (let branch = 0; branch < 22; branch += 1) {
        const angle = -1.2 + branch * 0.115
        context.lineWidth = 5 + (branch % 4)
        context.beginPath()
        context.moveTo(512, 1110)
        context.quadraticCurveTo(512 + Math.cos(angle) * 190, 710, 512 + Math.cos(angle) * 420, 340 + Math.sin(angle) * 80)
        context.stroke()
      }
      context.globalAlpha = 1
      const glow = context.createRadialGradient(512, 850, 20, 512, 850, 270)
      glow.addColorStop(0, 'rgba(255,211,105,.38)')
      glow.addColorStop(1, 'rgba(180,113,25,0)')
      context.fillStyle = glow
      context.fillRect(180, 520, 664, 650)
      context.strokeStyle = '#d6aa4f'
      context.lineWidth = 26
      context.beginPath()
      context.arc(512, 850, 210, 0.18, Math.PI * 1.78)
      context.stroke()
      context.lineWidth = 7
      context.beginPath()
      context.arc(512, 850, 158, 0, Math.PI * 2)
      context.stroke()
      context.fillStyle = '#090b09'
      context.beginPath()
      context.moveTo(0, 1270)
      context.lineTo(220, 1130)
      context.lineTo(420, 1240)
      context.lineTo(650, 1060)
      context.lineTo(1024, 1260)
      context.lineTo(1024, 1536)
      context.lineTo(0, 1536)
      context.fill()
      context.textAlign = 'center'
      context.fillStyle = '#d7b45e'
      context.font = '500 86px Georgia, serif'
      context.fillText(title, 512, 150)
      context.fillStyle = 'rgba(225,197,132,.76)'
      context.font = '400 25px Georgia, serif'
      context.fillText(subtitle, 512, 205)
    } else {
      const gradient = context.createLinearGradient(0, 0, 1024, 1536)
      gradient.addColorStop(0, '#101c27')
      gradient.addColorStop(0.5, '#35261f')
      gradient.addColorStop(1, '#0d1013')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = 'rgba(219,177,112,.13)'
      for (let band = 0; band < 9; band += 1) context.fillRect(0, 300 + band * 92, canvas.width, 3)
      context.fillStyle = '#15181c'
      context.beginPath()
      context.moveTo(410, 1280)
      context.quadraticCurveTo(465, 520, 512, 310)
      context.quadraticCurveTo(565, 520, 625, 1280)
      context.closePath()
      context.fill()
      context.strokeStyle = '#c59a61'
      context.lineWidth = 8
      context.globalAlpha = 0.68
      context.stroke()
      context.globalAlpha = 1
      context.fillStyle = 'rgba(234,202,151,.88)'
      context.font = '500 390px Georgia, serif'
      context.textAlign = 'center'
      context.fillText('33', 512, 1040)
      context.fillStyle = '#0b0d10'
      context.fillRect(0, 1180, 1024, 356)
      context.fillStyle = '#dfc291'
      context.font = '500 64px Georgia, serif'
      context.fillText('CLAIR OBSCUR', 512, 1320)
      context.font = '500 94px Georgia, serif'
      context.fillText('EXPEDITION 33', 512, 1425)
      for (let petal = 0; petal < 28; petal += 1) {
        const x = 80 + ((petal * 173) % 880)
        const y = 250 + ((petal * 251) % 850)
        context.save()
        context.translate(x, y)
        context.rotate(petal * 0.7)
        context.fillStyle = petal % 3 ? 'rgba(203,137,102,.48)' : 'rgba(225,196,143,.55)'
        context.beginPath()
        context.ellipse(0, 0, 9, 24, 0, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }
    }

    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 8
    nextTexture.needsUpdate = true
    return nextTexture
  }, [kind, subtitle, title])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0, 0, 0.085]}>
      <planeGeometry args={kind === 'whiteboard' ? [1.98, 0.99] : [0.75, 1.3]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function Whiteboard({ onSelect, content, compact }) {
  return (
    <Interactive id="whiteboard" label="关于这间房" onSelect={onSelect} position={[-1.65, 2.35, -3.02]} hitbox={[2.3, 1.25, 0.16]} labelOffset={[0, 0.85, 0]}>
      {(hovered) => (
        <WallCard width={2.18} height={1.12} color={hovered ? '#fffdfa' : '#f8f6f1'} border="#6f6e69">
          <WhiteboardArtwork content={content} compact={compact} />
        </WallCard>
      )}
    </Interactive>
  )
}

function GamePoster({ id, title, subtitle, position, colors, onSelect }) {
  const posterPath = id === 'eldenRing'
    ? publicAsset('assets/games/elden-ring-poster-source.jpg')
    : publicAsset('assets/games/expedition-33-poster-source.jpg')
  return (
    <Interactive id={id} label={title} onSelect={onSelect} position={position} hitbox={[0.9, 1.55, 0.18]} labelOffset={[0, 1, 0]}>
      {(hovered) => (
        <WallCard width={0.82} height={1.45} color={colors[0]} border="#22211f">
          <PosterArtwork path={posterPath} />
          {[-0.385, 0.385].map((x) => <Box key={x} args={[0.016, 1.4, 0.014]} position={[x, 0, 0.105]} color="#b89152" metalness={0.42} roughness={0.36} radius={0.005} />)}
          {[-0.7, 0.7].map((y) => <Box key={y} args={[0.77, 0.016, 0.014]} position={[0, y, 0.105]} color="#b89152" metalness={0.42} roughness={0.36} radius={0.005} />)}
          <mesh position={[0, 0, 0.12]}>
            <planeGeometry args={[0.75, 1.33]} />
            <meshPhysicalMaterial color="#d9e2e2" transparent opacity={hovered ? 0.15 : 0.09} transmission={0.05} roughness={0.12} metalness={0.02} depthWrite={false} />
          </mesh>
          <mesh position={[-0.17, 0.14, 0.126]} rotation={[0, 0, -0.26]}>
            <planeGeometry args={[0.06, 1.0]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={hovered ? 0.16 : 0.08} depthWrite={false} />
          </mesh>
        </WallCard>
      )}
    </Interactive>
  )
}

function PosterArtwork({ path }) {
  const texture = useTexture(path)

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  return (
    <mesh position={[0, 0, 0.085]}>
      <planeGeometry args={[0.75, 1.3]} />
      <meshStandardMaterial map={texture} roughness={0.48} metalness={0.01} />
    </mesh>
  )
}

function TravelPhoto({ size, tone, variant }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = size[0] > size[1] ? 1024 : 768
    canvas.height = size[0] > size[1] ? 680 : 1024
    const context = canvas.getContext('2d')
    const sky = context.createLinearGradient(0, 0, 0, canvas.height)
    const palettes = [
      ['#92b8bf', '#ead5ad', '#415d55'],
      ['#b9aa80', '#e3c689', '#675841'],
      ['#7395a5', '#d7b17b', '#60463c'],
      ['#8ca28a', '#e7d7b5', '#4f6750'],
    ][variant % 4]
    sky.addColorStop(0, palettes[0])
    sky.addColorStop(0.7, palettes[1])
    sky.addColorStop(1, palettes[2])
    context.fillStyle = sky
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(255,244,217,.58)'
    context.beginPath()
    context.arc(canvas.width * 0.72, canvas.height * 0.22, canvas.width * 0.08, 0, Math.PI * 2)
    context.fill()

    if (variant === 0) {
      context.fillStyle = '#4c665f'
      context.beginPath()
      context.moveTo(0, canvas.height)
      context.lineTo(canvas.width * 0.3, canvas.height * 0.42)
      context.lineTo(canvas.width * 0.5, canvas.height * 0.68)
      context.lineTo(canvas.width * 0.72, canvas.height * 0.34)
      context.lineTo(canvas.width, canvas.height * 0.6)
      context.lineTo(canvas.width, canvas.height)
      context.fill()
    } else if (variant === 1) {
      context.fillStyle = 'rgba(62,96,102,.64)'
      context.fillRect(0, canvas.height * 0.56, canvas.width, canvas.height * 0.44)
      context.strokeStyle = 'rgba(242,231,199,.68)'
      context.lineWidth = 7
      for (let wave = 0; wave < 5; wave += 1) {
        context.beginPath()
        context.moveTo(0, canvas.height * (0.62 + wave * 0.07))
        context.quadraticCurveTo(canvas.width * 0.5, canvas.height * (0.58 + wave * 0.08), canvas.width, canvas.height * (0.64 + wave * 0.07))
        context.stroke()
      }
    } else if (variant === 2) {
      context.fillStyle = '#51473f'
      for (let building = 0; building < 8; building += 1) {
        const width = canvas.width / 8 + 5
        const height = canvas.height * (0.22 + ((building * 7) % 4) * 0.08)
        context.fillRect(building * canvas.width / 8, canvas.height - height, width, height)
      }
      context.fillStyle = '#d8bb7e'
      for (let light = 0; light < 24; light += 1) context.fillRect(45 + (light % 8) * canvas.width / 9, canvas.height * 0.68 + Math.floor(light / 8) * 42, 10, 15)
    } else {
      context.fillStyle = '#50684f'
      context.fillRect(0, canvas.height * 0.48, canvas.width, canvas.height * 0.52)
      context.fillStyle = '#c3ad83'
      context.beginPath()
      context.moveTo(canvas.width * 0.42, canvas.height)
      context.lineTo(canvas.width * 0.49, canvas.height * 0.5)
      context.lineTo(canvas.width * 0.55, canvas.height * 0.5)
      context.lineTo(canvas.width * 0.68, canvas.height)
      context.fill()
    }
    context.fillStyle = 'rgba(250,244,226,.88)'
    context.font = `500 ${Math.round(canvas.width * 0.034)}px Consolas, monospace`
    context.fillText(`MEMORY 0${variant + 1}`, canvas.width * 0.06, canvas.height * 0.92)
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 12
    return nextTexture
  }, [size[0], size[1], tone, variant])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0, 0, 0.075]}>
      <planeGeometry args={[size[0], size[1]]} />
      <meshStandardMaterial map={texture} roughness={0.48} />
    </mesh>
  )
}

function PhotoFrame({ position, size, tone, variant }) {
  return (
    <group position={position}>
      <Box args={[size[0] + 0.08, size[1] + 0.08, 0.065]} color="#302f2d" radius={0.015} />
      <Box args={[size[0], size[1], 0.035]} position={[0, 0, 0.035]} color={tone} radius={0.008} />
      <TravelPhoto size={size} tone={tone} variant={variant} />
      <mesh position={[-size[0] * 0.18, size[1] * 0.03, 0.083]} rotation={[0, 0, -0.22]}>
        <planeGeometry args={[size[0] * 0.07, size[1] * 0.84]} />
        <meshBasicMaterial color="#fff" transparent opacity={0.09} depthWrite={false} />
      </mesh>
    </group>
  )
}

function TravelWall({ onSelect }) {
  return (
    <Interactive id="lifeWall" label="生活照片墙" onSelect={onSelect} position={[-4.05, 2.12, -3.0]} hitbox={[1.65, 1.45, 0.18]} labelOffset={[0, 1.02, 0]}>
      {(hovered) => (
        <group scale={hovered ? 1.015 : 1}>
          <PhotoFrame position={[-0.47, 0.12, 0]} size={[0.55, 0.78]} tone="#5f7b75" variant={0} />
          <PhotoFrame position={[0.3, 0.47, 0.012]} size={[0.5, 0.42]} tone="#94865d" variant={1} />
          <PhotoFrame position={[0.42, -0.18, 0.024]} size={[0.52, 0.48]} tone="#b46e4b" variant={2} />
          <PhotoFrame position={[-0.13, -0.57, 0.036]} size={[0.4, 0.28]} tone="#718468" variant={3} />
        </group>
      )}
    </Interactive>
  )
}

function Desk({ onSelect }) {
  return (
    <group>
      <Interactive id="computer" label="电脑与代码" onSelect={onSelect} position={[0, 0, -0.45]} hitbox={[3.15, 1.45, 1.05]} labelOffset={[0, 2.15, 0]}>
        {(hovered) => (
          <group>
            <Box args={[3.25, 0.105, 1.0]} position={[0, 1.22, 0]} color="#f3f1ec" roughness={0.34} radius={0.032} />
            <Box args={[3.13, 0.025, 0.9]} position={[0, 1.16, 0]} color="#d8d4cc" roughness={0.58} radius={0.012} />
            {[-1.47, 1.47].flatMap((x) => [-0.4, 0.4].map((z) => (
              <Box key={`${x}-${z}`} args={[0.1, 1.2, 0.1]} position={[x, 0.61, z]} color="#bd9463" roughness={0.58} radius={0.018} />
            )))}
            <Box args={[1.32, 0.78, 0.1]} position={[0.2, 1.82, -0.35]} color="#1a1b1d" roughness={0.35} metalness={0.2} radius={0.025} />
            <MonitorDisplay />
            <Box args={[0.08, 0.36, 0.08]} position={[0.2, 1.28, -0.34]} color="#383838" metalness={0.35} radius={0.018} />
            <Box args={[0.48, 0.05, 0.28]} position={[0.2, 1.26, -0.3]} color="#3e3d3a" metalness={0.28} radius={0.02} />
            <Keyboard />
            <mesh position={[0.82, 1.385, 0.14]} scale={[0.1, 0.045, 0.14]} castShadow>
              <sphereGeometry args={[1, 40, 28]} />
              <meshPhysicalMaterial color="#353738" roughness={0.32} clearcoat={0.48} clearcoatRoughness={0.25} />
            </mesh>
            <mesh position={[0.82, 1.43, 0.11]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.006, 0.12]} />
              <meshBasicMaterial color="#787d7d" />
            </mesh>
            <mesh position={[-1.31, 1.278, -0.25]}>
              <cylinderGeometry args={[0.055, 0.055, 0.018, 40]} />
              <meshStandardMaterial color="#4d4d4b" metalness={0.28} roughness={0.42} />
            </mesh>
          </group>
        )}
      </Interactive>
      <DeskLamp />
      <Mug />
      <Camera onSelect={onSelect} />
      <Plant position={[-0.7, 1.35, -0.72]} scale={0.68} />
      <DeskLifeDetails />
    </group>
  )
}

function DeskLifeDetails() {
  const cableGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.46, 1.3, -0.72),
      new THREE.Vector3(0.58, 1.26, -0.78),
      new THREE.Vector3(0.76, 1.255, -0.7),
      new THREE.Vector3(0.88, 1.23, -0.56),
    ])
    return new THREE.TubeGeometry(curve, 32, 0.009, 8, false)
  }, [])

  useEffect(() => () => cableGeometry.dispose(), [cableGeometry])

  return (
    <group>
      <mesh geometry={cableGeometry} castShadow><meshStandardMaterial color="#262728" roughness={0.72} /></mesh>
      <group position={[-0.88, 1.284, -0.16]} rotation={[0, 0.13, 0]}>
        <Box args={[0.5, 0.026, 0.35]} color="#b6815c" roughness={0.72} radius={0.018} />
        <Box args={[0.46, 0.012, 0.31]} position={[0, 0.02, 0]} color="#e5dac8" roughness={0.88} radius={0.01} />
        <mesh position={[0, 0.028, 0.012]}><boxGeometry args={[0.012, 0.008, 0.28]} /><meshStandardMaterial color="#c8bba8" roughness={0.8} /></mesh>
      </group>
      <mesh position={[-0.48, 1.287, -0.07]} rotation={[0, 0.18, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.38, 16]} />
        <meshStandardMaterial color="#4c5e59" metalness={0.18} roughness={0.42} />
      </mesh>
    </group>
  )
}

function Keyboard() {
  const keyTransforms = useMemo(() => {
    const rows = [
      { z: -0.105, offset: 0, widths: Array(14).fill(0.052) },
      { z: -0.05, offset: 0.012, widths: [0.076, ...Array(12).fill(0.052), 0.076] },
      { z: 0.005, offset: 0.026, widths: [0.09, ...Array(11).fill(0.052), 0.1] },
      { z: 0.06, offset: 0.045, widths: [0.115, ...Array(10).fill(0.052), 0.14] },
      { z: 0.115, offset: 0, widths: [0.07, 0.07, 0.07, 0.31, 0.07, 0.07, 0.07] },
    ]
    return rows.flatMap((row) => {
      const gap = 0.012
      const totalWidth = row.widths.reduce((sum, width) => sum + width, 0) + gap * (row.widths.length - 1)
      let cursor = -totalWidth / 2 + row.offset
      return row.widths.map((width) => {
        const x = cursor + width / 2
        cursor += width + gap
        return { position: [x, 0.056, row.z], scale: [width, 0.026, 0.042] }
      })
    })
  }, [])

  return (
    <group position={[0.1, 1.345, 0.17]} rotation={[0.035, 0, 0]}>
      <Box args={[1.08, 0.06, 0.35]} color="#292b2c" roughness={0.38} metalness={0.18} radius={0.032} />
      <Box args={[1.0, 0.018, 0.3]} position={[0, 0.036, 0]} color="#181a1b" roughness={0.66} radius={0.018} />
      <InstancedBoxes transforms={keyTransforms} color="#535859" roughness={0.43} metalness={0.08} />
      <mesh position={[0.475, 0.048, -0.127]}>
        <circleGeometry args={[0.008, 20]} />
        <meshBasicMaterial color="#6fa586" toneMapped={false} />
      </mesh>
    </group>
  )
}

function DeskLamp() {
  return (
    <group position={[-1.22, 1.32, -0.61]} rotation={[0, -0.08, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.19, 0.235, 0.065, 48]} /><meshPhysicalMaterial color="#242526" metalness={0.42} roughness={0.28} clearcoat={0.4} /></mesh>
      <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.075, 0.09, 0.05, 32]} /><meshStandardMaterial color="#343536" metalness={0.62} roughness={0.24} /></mesh>
      <mesh position={[0.06, 0.35, 0]} rotation={[0, 0, -0.25]} castShadow><cylinderGeometry args={[0.022, 0.022, 0.7, 24]} /><meshStandardMaterial color="#303132" metalness={0.72} roughness={0.22} /></mesh>
      <mesh position={[0.145, 0.68, 0]}><sphereGeometry args={[0.055, 32, 20]} /><meshStandardMaterial color="#404142" metalness={0.62} roughness={0.25} /></mesh>
      <mesh position={[0.27, 0.82, 0]} rotation={[0, 0, 0.72]} castShadow><cylinderGeometry args={[0.022, 0.022, 0.47, 24]} /><meshStandardMaterial color="#303132" metalness={0.72} roughness={0.22} /></mesh>
      <mesh position={[0.43, 0.93, 0]}><sphereGeometry args={[0.048, 32, 20]} /><meshStandardMaterial color="#404142" metalness={0.62} roughness={0.25} /></mesh>
      <group position={[0.49, 0.9, 0]} rotation={[0, 0, -1.1]}>
        <mesh castShadow><coneGeometry args={[0.19, 0.33, 48, 1, true]} /><meshPhysicalMaterial color="#232425" side={THREE.DoubleSide} roughness={0.3} metalness={0.18} clearcoat={0.3} /></mesh>
        <mesh position={[0, -0.165, 0]}><cylinderGeometry args={[0.16, 0.16, 0.012, 48]} /><meshStandardMaterial color="#f0d4aa" emissive="#ffd6a1" emissiveIntensity={0.35} roughness={0.42} /></mesh>
      </group>
      <pointLight position={[0.39, 0.78, 0.04]} intensity={0.28} color="#ffd5a3" distance={2.4} />
    </group>
  )
}

function Mug() {
  return (
    <group position={[-0.55, 1.42, -0.06]}>
      <mesh castShadow><cylinderGeometry args={[0.105, 0.092, 0.25, 48]} /><meshPhysicalMaterial color="#242322" roughness={0.28} clearcoat={0.7} clearcoatRoughness={0.2} /></mesh>
      <mesh position={[-0.11, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.075, 0.018, 16, 40, Math.PI * 1.55]} /><meshPhysicalMaterial color="#242322" roughness={0.28} clearcoat={0.7} /></mesh>
    </group>
  )
}

function Camera({ onSelect }) {
  return (
    <Interactive id="lifeCamera" label="打开生活相册" onSelect={onSelect} position={[1.14, 1.5, -0.3]} hitbox={[0.48, 0.42, 0.38]} labelOffset={[0, 0.45, 0]}>
      {(hovered) => (
        <group>
          <Box args={[0.42, 0.26, 0.24]} color={hovered ? '#363839' : '#202223'} roughness={0.34} metalness={0.32} radius={0.038} />
          <Box args={[0.11, 0.22, 0.06]} position={[0.185, -0.015, 0.09]} color="#171819" roughness={0.68} radius={0.026} />
          <mesh position={[0, 0, 0.145]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.13, 0.15, 0.17, 48]} /><meshStandardMaterial color="#1b1c1d" metalness={0.5} roughness={0.22} /></mesh>
          {[0.18, 0.225].map((z, index) => (
            <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.105 - index * 0.012, 0.012, 16, 64]} />
              <meshStandardMaterial color={index ? '#565a5b' : '#2b2d2e'} metalness={0.72} roughness={0.2} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.252]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.081, 48]} /><meshPhysicalMaterial color="#365560" metalness={0.38} roughness={0.08} clearcoat={1} clearcoatRoughness={0.06} /></mesh>
          <mesh position={[0, 0, 0.257]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.046, 48]} /><meshPhysicalMaterial color="#0d1b21" metalness={0.48} roughness={0.04} clearcoat={1} /></mesh>
          <Box args={[0.14, 0.095, 0.15]} position={[-0.09, 0.18, 0]} color="#252627" roughness={0.42} metalness={0.25} radius={0.018} />
          <Box args={[0.06, 0.035, 0.06]} position={[0.07, 0.16, 0.02]} color="#777976" metalness={0.68} roughness={0.22} radius={0.012} />
          <mesh position={[0.145, 0.16, 0.09]}><cylinderGeometry args={[0.03, 0.03, 0.022, 32]} /><meshStandardMaterial color="#bbb5aa" metalness={0.76} roughness={0.18} /></mesh>
          <mesh position={[0.145, 0.176, 0.09]}><cylinderGeometry args={[0.022, 0.022, 0.012, 24]} /><meshStandardMaterial color="#2b2c2d" metalness={0.48} roughness={0.3} /></mesh>
          {[-0.19, 0.19].map((x) => <mesh key={x} position={[x, 0.06, -0.13]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.025, 0.007, 10, 24]} /><meshStandardMaterial color="#aaa79f" metalness={0.8} roughness={0.2} /></mesh>)}
        </group>
      )}
    </Interactive>
  )
}

function SnackLabel() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    context.fillStyle = '#8b5b50'
    context.fillRect(0, 0, 512, 512)
    context.fillStyle = '#d8c9ae'
    context.fillRect(55, 118, 402, 155)
    context.fillStyle = '#67433d'
    context.font = '700 56px "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.fillText('零食补给', 256, 215)
    context.font = '500 24px Consolas, monospace'
    context.fillText('LITTLE TREATS', 256, 330)
    context.fillStyle = '#b99757'
    context.beginPath()
    context.arc(256, 395, 48, 0, Math.PI * 2)
    context.fill()
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 10
    return nextTexture
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 0, 0.146]}><planeGeometry args={[0.43, 0.48]} /><meshStandardMaterial map={texture} roughness={0.78} /></mesh>
}

function Chair() {
  return (
    <group position={[0.35, 0, 1.05]} rotation={[0, -0.08, 0]}>
      <RoundedBox args={[0.9, 0.17, 0.76]} position={[0, 0.8, 0]} rotation={[-0.035, 0, 0]} radius={0.1} smoothness={8} castShadow receiveShadow>
        <meshPhysicalMaterial color="#26292a" roughness={0.56} sheen={0.58} sheenColor="#5a5f61" clearcoat={0.12} />
      </RoundedBox>
      <RoundedBox args={[0.76, 0.045, 0.62]} position={[0, 0.895, -0.01]} rotation={[-0.035, 0, 0]} radius={0.06} smoothness={6}>
        <meshStandardMaterial color="#363a3c" roughness={0.78} />
      </RoundedBox>
      <group position={[0, 1.4, 0.31]} rotation={[-0.1, 0, 0]}>
        {[-0.37, 0.37].map((x) => <Box key={x} args={[0.065, 0.82, 0.075]} position={[x, 0, 0]} color="#282b2d" metalness={0.3} roughness={0.48} radius={0.028} />)}
        <Box args={[0.76, 0.07, 0.075]} position={[0, 0.38, 0]} color="#282b2d" metalness={0.3} roughness={0.48} radius={0.03} />
        <Box args={[0.68, 0.07, 0.075]} position={[0, -0.38, 0]} color="#282b2d" metalness={0.3} roughness={0.48} radius={0.03} />
        <RoundedBox args={[0.66, 0.68, 0.035]} position={[0, 0, 0.012]} radius={0.07} smoothness={7} castShadow>
          <meshStandardMaterial color="#34383a" roughness={0.82} transparent opacity={0.76} side={THREE.DoubleSide} />
        </RoundedBox>
        <mesh position={[0, 0, 0.036]}>
          <planeGeometry args={[0.58, 0.59, 12, 15]} />
          <meshStandardMaterial color="#777d7f" wireframe transparent opacity={0.2} roughness={0.9} />
        </mesh>
        <RoundedBox args={[0.48, 0.1, 0.07]} position={[0, -0.19, 0.075]} radius={0.045} smoothness={6}>
          <meshPhysicalMaterial color="#202324" roughness={0.6} sheen={0.4} />
        </RoundedBox>
      </group>
      <Box args={[0.1, 0.47, 0.1]} position={[0, 1.01, 0.24]} rotation={[-0.12, 0, 0]} color="#34383a" metalness={0.4} roughness={0.36} radius={0.035} />
      <group position={[0, 1.91, 0.38]} rotation={[-0.08, 0, 0]}>
        <Box args={[0.12, 0.22, 0.08]} position={[0, -0.13, -0.02]} color="#333739" metalness={0.38} roughness={0.38} radius={0.035} />
        <RoundedBox args={[0.5, 0.2, 0.1]} radius={0.075} smoothness={8} castShadow>
          <meshPhysicalMaterial color="#252829" roughness={0.58} sheen={0.5} sheenColor="#555b5d" />
        </RoundedBox>
      </group>
      <Box args={[0.08, 0.72, 0.08]} position={[0, 0.42, 0.12]} color="#3b3e40" metalness={0.58} roughness={0.3} radius={0.03} />
      <mesh position={[0, 0.12, 0.1]}><cylinderGeometry args={[0.1, 0.13, 0.18, 28]} /><meshStandardMaterial color="#45494a" metalness={0.6} roughness={0.26} /></mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = index * Math.PI * 0.4
        return (
          <group key={index} position={[Math.sin(angle) * 0.38, 0.09, 0.1 + Math.cos(angle) * 0.38]} rotation={[0, angle, 0]}>
            <Box args={[0.08, 0.07, 0.55]} color="#333436" metalness={0.45} radius={0.025} />
            <mesh position={[0, -0.04, 0.29]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.05, 14]} /><meshStandardMaterial color="#222" /></mesh>
          </group>
        )
      })}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.52, 0.99, 0]}>
          <Box args={[0.075, 0.39, 0.075]} position={[0, 0.03, 0]} color="#34383a" metalness={0.28} roughness={0.42} radius={0.025} />
          <Box args={[0.3, 0.075, 0.12]} position={[side * 0.09, 0.24, -0.015]} color="#292c2d" roughness={0.58} radius={0.038} />
        </group>
      ))}
    </group>
  )
}

function Tonearm({ playing }) {
  const arm = useRef()
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.28, 0.02, -0.18),
      new THREE.Vector3(0.22, 0.045, -0.08),
      new THREE.Vector3(0.09, 0.045, 0.05),
      new THREE.Vector3(-0.06, 0.035, 0.13),
    ])
    return new THREE.TubeGeometry(curve, 48, 0.012, 12, false)
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state, delta) => {
    if (!arm.current) return
    const target = playing ? -0.12 : 0.13
    if (Math.abs(arm.current.rotation.y - target) < 0.002) return
    arm.current.rotation.y = THREE.MathUtils.damp(arm.current.rotation.y, target, 6, delta)
    state.invalidate()
  })

  return (
    <group ref={arm} position={[0.02, 1.155, -0.03]} rotation={[0, 0.13, 0]}>
      <mesh position={[0.31, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.075, 0.09, 0.075, 32]} />
        <meshStandardMaterial color="#26292a" metalness={0.62} roughness={0.25} />
      </mesh>
      <mesh position={[0.31, 0.06, -0.2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.07, 24]} />
        <meshStandardMaterial color="#b8b4aa" metalness={0.82} roughness={0.2} />
      </mesh>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color="#c8c4ba" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0.38, 0.025, -0.26]} rotation={[Math.PI / 2, 0, 0.62]} castShadow>
        <cylinderGeometry args={[0.028, 0.04, 0.16, 24]} />
        <meshStandardMaterial color="#393b3c" metalness={0.55} roughness={0.28} />
      </mesh>
      <Box args={[0.115, 0.025, 0.055]} position={[-0.095, 0.035, 0.15]} rotation={[0, -0.42, 0]} color="#272829" metalness={0.42} roughness={0.3} radius={0.008} />
      <Box args={[0.04, 0.028, 0.045]} position={[-0.14, 0.018, 0.17]} rotation={[0, -0.42, 0]} color="#b65e4d" roughness={0.42} radius={0.006} />
    </group>
  )
}

function VinylPlatter({ hovered, playing }) {
  const vinyl = useRef()
  const { invalidate } = useThree()

  useEffect(() => {
    if (!playing) return undefined
    let previous = window.performance.now()
    const timer = window.setInterval(() => {
      if (!vinyl.current) return
      const now = window.performance.now()
      vinyl.current.rotation.y += Math.min((now - previous) / 1000, 0.08) * 0.55
      previous = now
      invalidate()
    }, 42)
    return () => window.clearInterval(timer)
  }, [invalidate, playing])

  return (
    <group ref={vinyl} position={[-0.43, 1.15, -0.015]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.305, 0.305, 0.026, 96]} />
        <meshPhysicalMaterial color={hovered ? '#17191a' : '#0b0c0d'} roughness={0.28} metalness={0.18} clearcoat={0.35} clearcoatRoughness={0.25} />
      </mesh>
      {[0.13, 0.17, 0.21, 0.25, 0.282].map((radius) => (
        <mesh key={radius} position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.0017, 6, 96]} />
          <meshStandardMaterial color="#393a3a" roughness={0.5} metalness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.018, 48]} />
        <meshStandardMaterial color="#a45143" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.055, 20]} />
        <meshStandardMaterial color="#c8c5bc" metalness={0.9} roughness={0.16} />
      </mesh>
    </group>
  )
}

function RecordPlayer({ onSelect, playing }) {
  return (
    <Interactive id="music" label="唱片机与音乐" onSelect={onSelect} position={[-3.48, 0, -1.28]} hitbox={[2.2, 1.72, 1.08]} labelOffset={[0, 2.0, 0]}>
      {(hovered) => (
        <group>
          {[[-0.82, -0.28], [0.82, -0.28], [-0.82, 0.28], [0.82, 0.28]].map(([x, z]) => (
            <Box key={`${x}-${z}`} args={[0.075, 0.3, 0.075]} position={[x, 0.15, z]} color="#76563d" roughness={0.58} radius={0.018} />
          ))}
          <Box args={[2.05, 0.75, 0.9]} position={[0, 0.59, 0]} color="#594431" roughness={0.56} radius={0.045} />
          <Box args={[1.92, 0.61, 0.075]} position={[0, 0.59, 0.46]} color="#302d29" roughness={0.68} radius={0.022} />
          <Box args={[0.86, 0.48, 0.045]} position={[-0.49, 0.62, 0.505]} color="#1f2020" roughness={0.72} radius={0.016} />
          <mesh position={[-0.49, 0.64, 0.532]}>
            <circleGeometry args={[0.14, 48]} />
            <meshStandardMaterial color="#b4a68d" roughness={0.78} />
          </mesh>
          <mesh position={[-0.49, 0.64, 0.536]}>
            <circleGeometry args={[0.045, 32]} />
            <meshStandardMaterial color="#34302a" roughness={0.5} />
          </mesh>
          {[-0.85, -0.13].map((x) => (
            <mesh key={x} position={[x, 0.38, 0.51]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.025, 24]} />
              <meshStandardMaterial color="#c6c0b3" metalness={0.68} roughness={0.22} />
            </mesh>
          ))}
          <Box args={[0.84, 0.5, 0.42]} position={[0.49, 0.61, 0.27]} color="#171819" roughness={0.78} radius={0.018} />
          {Array.from({ length: 10 }, (_, index) => (
            <Box
              key={index}
              args={[0.045 + (index % 2) * 0.008, 0.42 + (index % 3) * 0.025, 0.37]}
              position={[0.275 + index * 0.048, 0.61, 0.5]}
              rotation={[0, 0, (index % 4 - 1.5) * 0.012]}
              color={['#815645', '#354d50', '#aa9068', '#5a5146'][index % 4]}
              roughness={0.75}
              radius={0.006}
            />
          ))}
          <Box args={[1.02, 0.11, 0.72]} position={[-0.39, 1.04, -0.02]} color="#292b2b" metalness={0.2} roughness={0.38} radius={0.035} />
          <Box args={[0.92, 0.035, 0.62]} position={[-0.39, 1.105, -0.02]} color="#343636" roughness={0.62} radius={0.025} />
          <VinylPlatter hovered={hovered} playing={playing} />
          <Tonearm playing={playing} />
          <mesh position={[-0.02, 1.14, 0.255]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.018, 24]} />
            <meshStandardMaterial color="#cfb065" metalness={0.45} roughness={0.28} />
          </mesh>
          <mesh position={[-0.09, 1.14, 0.255]}>
            <sphereGeometry args={[0.014, 16, 12]} />
            <meshStandardMaterial color="#b95043" emissive="#8d2119" emissiveIntensity={0.25} />
          </mesh>
          <group position={[-0.39, 1.39, -0.36]} rotation={[-0.78, 0, 0]}>
            <RoundedBox args={[1.04, 0.62, 0.045]} radius={0.018} smoothness={6} castShadow>
              <meshPhysicalMaterial color="#cbd7d8" transparent opacity={0.29} transmission={0.08} thickness={0.035} roughness={0.16} metalness={0.02} depthWrite={false} />
            </RoundedBox>
            <RoundedBox args={[1.04, 0.045, 0.42]} position={[0, -0.29, 0.19]} radius={0.012} smoothness={5}>
              <meshPhysicalMaterial color="#cbd7d8" transparent opacity={0.24} transmission={0.08} roughness={0.14} depthWrite={false} />
            </RoundedBox>
          </group>
          <Box args={[0.72, 0.07, 0.58]} position={[0.55, 1.01, -0.055]} color="#3a332d" roughness={0.52} radius={0.024} />
          <Box args={[0.58, 0.36, 0.05]} position={[0.53, 1.2, -0.3]} rotation={[-0.12, 0, 0]} color="#ad7658" roughness={0.62} radius={0.012} />
          <Box args={[0.48, 0.055, 0.018]} position={[0.53, 1.25, -0.268]} rotation={[-0.12, 0, 0]} color="#d2b37c" roughness={0.56} radius={0.004} />
        </group>
      )}
    </Interactive>
  )
}

function SuitcaseAndSnacks({ onSelect }) {
  return (
    <Interactive id="travel" label="旅行相册" onSelect={onSelect} position={[-4.75, 0, -0.95]} hitbox={[1.25, 1.9, 0.9]} labelOffset={[0, 2.1, 0]}>
      {(hovered) => (
        <group>
          <Box args={[0.95, 1.45, 0.55]} position={[0, 0.82, 0]} color={hovered ? '#323437' : '#25272a'} roughness={0.48} metalness={0.25} radius={0.16} />
          {[-0.28, 0, 0.28].map((x) => <Box key={x} args={[0.035, 1.12, 0.57]} position={[x, 0.82, 0]} color="#44464a" radius={0.016} />)}
          <Box args={[0.88, 0.04, 0.58]} position={[0, 1.5, 0]} color="#55575a" metalness={0.38} roughness={0.34} radius={0.016} />
          {[-0.16, 0.16].map((x) => <Box key={x} args={[0.035, 0.42, 0.035]} position={[x, 1.69, -0.02]} color="#848585" metalness={0.72} roughness={0.24} radius={0.012} />)}
          <Box args={[0.39, 0.055, 0.095]} position={[0, 1.91, -0.02]} color="#202124" metalness={0.35} roughness={0.42} radius={0.025} />
          {[-0.39, 0.39].flatMap((x) => [-0.21, 0.21].map((y) => <Box key={`${x}-${y}`} args={[0.12, 0.12, 0.575]} position={[x, 0.82 + y * 2.7, 0]} color="#343639" roughness={0.52} metalness={0.22} radius={0.035} />))}
          <Box args={[0.035, 1.06, 0.57]} position={[0.45, 0.83, 0]} color="#757678" metalness={0.4} roughness={0.38} radius={0.014} />
          {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.08, 12]} /><meshStandardMaterial color="#222" /></mesh>)}
          <group position={[0.52, 0.37, 0.29]} rotation={[0, 0.08, -0.035]} scale={0.82}>
            <Box args={[0.52, 0.58, 0.28]} color="#87584f" roughness={0.82} radius={0.045} />
            <SnackLabel />
            {[-0.17, -0.055, 0.06, 0.175].map((x, index) => <Box key={x} args={[0.09, 0.13 + (index % 2) * 0.04, 0.27]} position={[x, 0.34, 0]} rotation={[0, 0, index % 2 ? 0.18 : -0.14]} color={index % 2 ? '#a36a59' : '#bea270'} roughness={0.86} radius={0.018} />)}
          </group>
        </group>
      )}
    </Interactive>
  )
}

function Plant({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh><cylinderGeometry args={[0.16, 0.12, 0.28, 18]} /><meshStandardMaterial color="#ded4c6" roughness={0.82} /></mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI * 0.25
        return <mesh key={index} position={[Math.cos(angle) * 0.09, 0.22 + (index % 2) * 0.08, Math.sin(angle) * 0.09]} rotation={[0.4, angle, index % 2 ? 0.45 : -0.45]} scale={[1.35, 0.68, 0.55]} castShadow><sphereGeometry args={[0.08, 24, 16]} /><meshStandardMaterial color={index % 2 ? '#496746' : '#5c7b50'} roughness={0.8} /></mesh>
      })}
    </group>
  )
}

function BookVolume({ book, width, height, hovered, compact }) {
  const [coverImage, setCoverImage] = useState(null)

  useEffect(() => {
    if (!book.cover) {
      setCoverImage(null)
      return undefined
    }
    let active = true
    const image = new Image()
    image.onload = () => active && setCoverImage(image)
    image.src = book.cover
    return () => { active = false }
  }, [book.cover])

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    const textureScale = compact ? 1 : 2
    canvas.width = 512 * textureScale
    canvas.height = 1536 * textureScale
    const context = canvas.getContext('2d')
    context.scale(textureScale, textureScale)
    const palette = book.spine || { base: book.color, ink: indexTextColor(book.color), accent: '#c7ac78' }
    context.fillStyle = palette.base
    context.fillRect(0, 0, 512, 1536)
    if (coverImage) {
      context.save()
      context.globalAlpha = 0.24
      context.drawImage(coverImage, 0, 0, 512, 1536)
      context.restore()
      const veil = context.createLinearGradient(0, 0, 512, 0)
      veil.addColorStop(0, palette.base)
      veil.addColorStop(0.18, `${palette.base}e8`)
      veil.addColorStop(0.5, `${palette.base}b8`)
      veil.addColorStop(0.82, `${palette.base}e8`)
      veil.addColorStop(1, palette.base)
      context.fillStyle = veil
      context.fillRect(0, 0, 512, 1536)
    }
    context.fillStyle = palette.accent
    context.fillRect(0, 0, 34, 1536)
    context.fillRect(76, 105, 360, 10)
    context.fillRect(76, 1418, 360, 7)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = palette.ink
    context.font = '800 76px "Microsoft YaHei", sans-serif'
    const title = book.label.replace(/[《》]/g, '').slice(0, 10)
    const titleStart = Math.max(235, 620 - title.length * 45)
    context.lineWidth = 8
    context.strokeStyle = palette.base
    Array.from(title).forEach((character, index) => {
      const x = 270
      const y = titleStart + index * 94
      context.strokeText(character, x, y)
      context.fillText(character, x, y)
    })
    context.font = '500 30px "Microsoft YaHei", sans-serif'
    context.globalAlpha = 0.78
    const author = book.author.replace(/【.*?】/g, '').slice(0, 12)
    context.fillText(author, 270, 1326)
    context.globalAlpha = 1
    context.font = '600 24px Georgia, serif'
    context.fillText(book.confirmed ? book.eyebrow.replace('READING · ', 'BOOK ') : 'TO BE CHOSEN', 270, 165)
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = compact ? 4 : 16
    nextTexture.generateMipmaps = !compact
    nextTexture.minFilter = compact ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter
    nextTexture.magFilter = THREE.LinearFilter
    return nextTexture
  }, [book, compact, coverImage])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[0, hovered ? 0.055 : 0, hovered ? 0.08 : 0]}>
      <Box args={[width, height, 0.34]} color={book.color} roughness={0.66} radius={0.012} />
      <mesh position={[0, 0, 0.176]}>
        <planeGeometry args={[width * 0.9, height * 0.94]} />
        <meshStandardMaterial map={texture} roughness={0.68} metalness={0.01} />
      </mesh>
      <Box args={[width * 0.84, height * 0.88, 0.012]} position={[0, 0, -0.177]} color="#eee6d7" roughness={0.9} radius={0.003} />
      <Box args={[width * 0.82, 0.012, 0.3]} position={[0, height * 0.49, 0]} color="#efe8dc" roughness={0.92} radius={0.002} />
    </group>
  )
}

function indexTextColor(color) {
  const parsed = new THREE.Color(color)
  return parsed.getHSL({}).l > 0.62 ? '#263239' : '#f1e6cf'
}

function Bookshelf({ onSelect, selectedId, compact }) {
  const shelfFocused = selectedId === 'bookshelf'
  const selectBook = (bookId) => onSelect(compact && !shelfFocused ? 'bookshelf' : bookId)

  return (
    <Interactive id="bookshelf" label="靠近我的十本书" onSelect={onSelect} position={[2.8, 0, -2.35]} hitbox={[2.18, 1.5, 0.72]} labelOffset={[0, 1.48, 0.38]}>
      <Box args={[2.05, 0.92, 0.62]} position={[0, 0.49, 0]} color="#9b744c" roughness={0.68} radius={0.035} />
      <Box args={[1.8, 0.65, 0.46]} position={[0, 0.5, 0.04]} color="#4f3a29" roughness={0.72} radius={0.018} />
      {books.map((book, index) => {
        const height = 0.48 + (index % 3) * 0.055
        const width = 0.12 + (index % 2) * 0.025
        return (
          <Interactive key={book.id} id={book.id} label={book.label} onSelect={selectBook} position={[-0.73 + index * 0.16, 0.22 + height / 2, 0.3]} hitbox={[Math.max(width + 0.04, compact ? 0.19 : 0), height + 0.06, 0.42]} labelOffset={[0, 0, 0.42]}>
            {(hovered) => <BookVolume book={book} width={width} height={height} hovered={hovered} compact={compact} />}
          </Interactive>
        )
      })}
      <Plant position={[0.63, 1.1, 0]} scale={0.75} />
    </Interactive>
  )
}

function TreadmillDisplay() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 420
    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, 1024, 420)
    gradient.addColorStop(0, '#0b2026')
    gradient.addColorStop(1, '#101719')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1024, 420)
    context.strokeStyle = '#31454a'
    context.lineWidth = 3
    context.strokeRect(14, 14, 996, 392)
    context.fillStyle = '#76a99c'
    context.font = '600 38px Consolas, monospace'
    context.fillText('RUN', 52, 72)
    const metrics = [['6.20', 'PACE'], ['5.12', 'KM'], ['32:18', 'TIME']]
    metrics.forEach(([value, label], index) => {
      const x = 68 + index * 320
      context.fillStyle = '#e0d9c7'
      context.font = '500 74px Consolas, monospace'
      context.fillText(value, x, 210)
      context.fillStyle = '#6f9189'
      context.font = '500 25px Consolas, monospace'
      context.fillText(label, x, 254)
    })
    context.strokeStyle = '#b95a49'
    context.lineWidth = 7
    context.beginPath()
    context.moveTo(55, 350)
    ;[0.2, 0.45, 0.32, 0.67, 0.54, 0.82, 0.63, 0.74].forEach((value, index) => context.lineTo(85 + index * 120, 360 - value * 85))
    context.stroke()
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 12
    return nextTexture
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 0.04, 0.132]}><planeGeometry args={[0.78, 0.31]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#72968f" emissiveIntensity={0.16} roughness={0.18} toneMapped={false} /></mesh>
}

function Treadmill({ onSelect }) {
  return (
    <Interactive id="running" label="跑步" onSelect={onSelect} position={[4.15, 0, -0.82]} rotation={[0, -0.04, 0]} hitbox={[0.98, 1.9, 2.55]} labelOffset={[0, 2.38, -0.7]}>
      {(hovered) => (
        <group scale={0.9}>
          <Box args={[1.3, 0.2, 2.82]} position={[0, 0.18, 0]} color="#282b2d" roughness={0.38} metalness={0.3} radius={0.13} />
          <Box args={[1.02, 0.045, 2.4]} position={[0, 0.305, 0.08]} color={hovered ? '#2d3436' : '#121617'} roughness={0.68} radius={0.055} />
          {[-0.48, 0.48].map((x) => <Box key={x} args={[0.07, 0.025, 2.25]} position={[x, 0.335, 0.08]} color="#626667" metalness={0.38} roughness={0.38} radius={0.012} />)}
          {[-1.02, 1.08].map((z) => <mesh key={z} position={[0, 0.27, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.075, 0.075, 1.02, 32]} /><meshStandardMaterial color="#151718" metalness={0.5} roughness={0.28} /></mesh>)}
          <Box args={[1.36, 0.4, 0.58]} position={[0, 0.36, -1.12]} color="#303437" roughness={0.34} metalness={0.3} radius={0.13} />
          <Box args={[1.12, 0.07, 0.32]} position={[0, 0.56, -1.12]} color="#44494b" metalness={0.42} roughness={0.32} radius={0.03} />
          {[-0.53, 0.53].map((x) => (
            <group key={x}>
              <Box args={[0.085, 1.5, 0.085]} position={[x, 1.22, -1.14]} rotation={[-0.1, 0, 0]} color="#313638" metalness={0.62} roughness={0.27} radius={0.038} />
              <mesh position={[x, 1.87, -1.08]}><sphereGeometry args={[0.07, 28, 18]} /><meshStandardMaterial color="#3a3e40" metalness={0.56} roughness={0.3} /></mesh>
              <Box args={[0.085, 0.085, 0.88]} position={[x, 1.67, -0.7]} rotation={[-0.17, 0, 0]} color="#313638" metalness={0.62} roughness={0.27} radius={0.038} />
              <Box args={[0.13, 0.11, 0.38]} position={[x, 1.63, -0.42]} rotation={[-0.17, 0, 0]} color="#222526" roughness={0.62} radius={0.05} />
            </group>
          ))}
          <group position={[0, 1.88, -1.04]} rotation={[-0.2, 0, 0]}>
            <Box args={[1.22, 0.58, 0.26]} color="#25292b" roughness={0.3} metalness={0.3} radius={0.11} />
            <TreadmillDisplay />
            {[-0.48, 0.48].map((x) => <mesh key={x} position={[x, -0.03, 0.14]}><cylinderGeometry args={[0.045, 0.045, 0.025, 28]} /><meshStandardMaterial color="#8b8f8d" metalness={0.58} roughness={0.25} /></mesh>)}
          </group>
          <mesh position={[0, 1.67, -0.84]}><sphereGeometry args={[0.058, 24, 16]} /><meshStandardMaterial color="#c95542" emissive="#aa3328" emissiveIntensity={0.35} /></mesh>
          <Box args={[0.025, 0.32, 0.025]} position={[0, 1.51, -0.83]} rotation={[0, 0, 0.18]} color="#b54e42" roughness={0.45} radius={0.01} />
          <Box args={[0.1, 0.08, 0.025]} position={[-0.03, 1.34, -0.82]} rotation={[0, 0, 0.18]} color="#d55c4d" roughness={0.38} radius={0.025} />
        </group>
      )}
    </Interactive>
  )
}

function Racket({ color, x }) {
  const stringTransforms = useMemo(() => {
    const vertical = Array.from({ length: 9 }, (_, index) => -0.12 + index * 0.03).map((offset) => ({
      position: [offset, 0, 0.003],
      scale: [0.0026, 0.39 * Math.sqrt(Math.max(0, 1 - (offset / 0.16) ** 2)), 0.003],
    }))
    const horizontal = Array.from({ length: 11 }, (_, index) => -0.18 + index * 0.036).map((offset) => ({
      position: [0, offset, 0.006],
      scale: [0.3 * Math.sqrt(Math.max(0, 1 - (offset / 0.21) ** 2)), 0.0026, 0.003],
    }))
    return [...vertical, ...horizontal]
  }, [])
  const gripTransforms = useMemo(() => [-0.865, -0.82, -0.775, -0.73, -0.685].map((y) => ({
    position: [0, y, 0.034], scale: [0.064, 0.012, 0.003],
  })), [])
  return (
    <group position={[x, 0, 0]}>
      <mesh scale={[0.76, 1, 0.9]} castShadow><torusGeometry args={[0.21, 0.018, 16, 72]} /><meshPhysicalMaterial color={color} roughness={0.28} metalness={0.4} clearcoat={0.45} /></mesh>
      <InstancedBoxes transforms={stringTransforms} color="#d8d4c9" roughness={0.62} />
      {[-0.055, 0.055].map((branch) => <Box key={branch} args={[0.018, 0.18, 0.025]} position={[branch * 0.55, -0.28, 0]} rotation={[0, 0, branch > 0 ? -0.28 : 0.28]} color={color} metalness={0.42} roughness={0.3} radius={0.008} />)}
      <Box args={[0.035, 0.35, 0.035]} position={[0, -0.46, 0]} color="#55595a" metalness={0.62} roughness={0.26} radius={0.014} />
      <mesh position={[0, -0.64, 0]}><coneGeometry args={[0.055, 0.1, 28]} /><meshStandardMaterial color={color} metalness={0.35} roughness={0.32} /></mesh>
      <Box args={[0.075, 0.24, 0.065]} position={[0, -0.78, 0]} color="#222425" roughness={0.76} radius={0.025} />
      <InstancedBoxes transforms={gripTransforms} color="#666865" roughness={0.84} />
    </group>
  )
}

function BadmintonWall({ onSelect }) {
  return (
    <Interactive id="badminton" label="羽毛球" onSelect={onSelect} position={[5.08, 2.43, -2.35]} rotation={[0, -Math.PI / 2, 0]} hitbox={[1.0, 1.7, 0.2]} labelOffset={[0, 1.05, 0]}>
      {(hovered) => (
        <group scale={hovered ? 1.025 : 1}>
          {[-0.22, 0.25].map((x) => <mesh key={`hook-${x}`} position={[x, 0.34, -0.025]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.045, 0.012, 12, 32, Math.PI]} /><meshStandardMaterial color="#807a70" metalness={0.55} roughness={0.34} /></mesh>)}
          <Racket color="#a94d41" x={-0.22} />
          <Racket color="#47758d" x={0.25} />
        </group>
      )}
    </Interactive>
  )
}

function ProceduralShoeFallback({ index }) {
  return (
    <group rotation={[0, index ? -0.16 : 0.12, 0]}>
      <RoundedBox args={[0.31, 0.09, 0.7]} position={[0, -0.03, 0]} radius={0.075} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#eeeae2" roughness={0.52} clearcoat={0.16} />
      </RoundedBox>
      <RoundedBox args={[0.275, 0.18, 0.56]} position={[0, 0.07, -0.025]} radius={0.09} smoothness={4} castShadow>
        <meshStandardMaterial color="#cdd4d3" roughness={0.56} />
      </RoundedBox>
      <Box args={[0.18, 0.045, 0.3]} position={[0, 0.19, 0.01]} rotation={[0.16, 0, 0]} color="#6f7b7e" roughness={0.5} radius={0.022} />
    </group>
  )
}

function RunningShoeModel({ index, compact }) {
  const { scene } = useGLTF(publicAsset('assets/models/running-shoe.glb'))
  const prepared = useMemo(() => {
    const clone = scene.clone(true)
    const mobileMaterials = []
    clone.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = false
        object.receiveShadow = false
        if (compact) {
          const material = new THREE.MeshStandardMaterial({
            color: index ? '#d8dedc' : '#e7e2d9',
            roughness: 0.58,
            metalness: 0.02,
          })
          object.material = material
          mobileMaterials.push(material)
        }
      }
    })
    const bounds = new THREE.Box3().setFromObject(clone)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    clone.position.sub(center)
    return { clone, mobileMaterials, scale: 0.72 / Math.max(size.x, size.y, size.z) }
  }, [compact, index, scene])

  useEffect(() => () => prepared.mobileMaterials.forEach((material) => material.dispose()), [prepared])

  return (
    <group rotation={[0, index ? -0.16 : 0.12, 0]}>
      <primitive object={prepared.clone} scale={prepared.scale} rotation={[0, Math.PI / 2, 0]} />
    </group>
  )
}

function RunningShoe({ x, index, compact }) {
  return (
    <group position={[x, 0.18, index * 0.13]}>
      <Suspense fallback={<ProceduralShoeFallback index={index} />}>
        <RunningShoeModel index={index} compact={compact} />
      </Suspense>
    </group>
  )
}

function Shuttlecock({ position, rotation = [0, 0, 0] }) {
  const featherLines = useMemo(() => {
    const points = []
    Array.from({ length: 12 }, (_, index) => index * Math.PI / 6).forEach((angle) => {
      points.push(
        new THREE.Vector3(Math.cos(angle) * 0.045, 0.105, Math.sin(angle) * 0.045),
        new THREE.Vector3(Math.cos(angle) * 0.118, 0.335, Math.sin(angle) * 0.118),
      )
    })
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [])

  useEffect(() => () => featherLines.dispose(), [featherLines])

  return (
    <group position={position} rotation={rotation} scale={1.18}>
      <mesh position={[0, 0.025, 0]} castShadow>
        <sphereGeometry args={[0.075, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.64]} />
        <meshPhysicalMaterial color="#d8c39d" roughness={0.72} clearcoat={0.14} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.047, 0.065, 0.08, 32]} />
        <meshStandardMaterial color="#eee9dd" roughness={0.76} />
      </mesh>
      <lineSegments geometry={featherLines}>
        <lineBasicMaterial color="#c8c2b5" transparent opacity={0.9} />
      </lineSegments>
      <mesh position={[0, 0.225, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.12, 0.27, 16, 1, true]} />
        <meshStandardMaterial color="#eeeae0" side={THREE.DoubleSide} roughness={0.8} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {[0.13, 0.205].map((y, index) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.064 + index * 0.025, 0.008, 12, 48]} />
          <meshStandardMaterial color={index ? '#b9b2a5' : '#cbc4b6'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function ShoesAndShuttles({ compact }) {
  return (
    <group position={[3.15, 0.08, -0.72]}>
      {[-0.22, 0.23].map((x, index) => <RunningShoe key={x} x={x} index={index} compact={compact} />)}
      <Shuttlecock position={[-0.58, 0.06, 0.34]} rotation={[0.08, 0, -0.26]} />
      <Shuttlecock position={[-0.83, 0.08, 0.18]} rotation={[0.02, 0.42, 0.18]} />
    </group>
  )
}

useGLTF.preload(publicAsset('assets/models/running-shoe.glb'))
useTexture.preload(publicAsset('assets/games/elden-ring-poster-source.jpg'))
useTexture.preload(publicAsset('assets/games/expedition-33-poster-source.jpg'))

function RoomShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 11]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.84} />
      </mesh>
      <mesh position={[0, 2.25, -3.15]} receiveShadow>
        <planeGeometry args={[11, 4.5]} />
        <meshStandardMaterial color="#f6f3ed" roughness={0.86} />
      </mesh>
      <mesh position={[5.25, 2.25, 0.15]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6.6, 4.5]} />
        <meshStandardMaterial color="#f2eee7" roughness={0.87} />
      </mesh>
      <Box args={[10.5, 0.08, 0.08]} position={[0, 0.045, -3.08]} color="#d9d4cc" roughness={0.72} radius={0.018} />
      <Box args={[0.08, 0.08, 6.3]} position={[5.18, 0.045, 0.03]} color="#d9d4cc" roughness={0.72} radius={0.018} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.014, 0.62]} receiveShadow>
        <planeGeometry args={[5.8, 4.2]} />
        <meshStandardMaterial color="#9b7564" roughness={0.91} />
      </mesh>
    </group>
  )
}

const StaticRoom = memo(function StaticRoom({ onSelect, selectedId, compact, lowPower }) {
  return (
    <>
      <color attach="background" args={['#f4f1eb']} />
      {!lowPower && <StudioEnvironment />}
      <ambientLight intensity={0.38} color="#fffaf2" />
      <hemisphereLight intensity={0.46} color="#fffdf8" groundColor="#b9aa9d" />
      <directionalLight
        castShadow
        position={[-5.5, 7.5, 6.5]}
        intensity={1.48}
        color="#fff4e6"
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-5}
        shadow-bias={-0.00015}
      />
      {!lowPower && <>
        <spotLight position={[-4.7, 5.4, 3.6]} angle={0.52} penumbra={0.94} intensity={0.62} color="#ffdcb1" />
        <rectAreaLight position={[1.5, 4.2, 3.8]} rotation={[-0.72, 0.15, 0]} width={5.5} height={3.2} intensity={0.82} color="#fffdf7" />
        <rectAreaLight position={[-4.5, 2.8, 0.8]} rotation={[-0.3, -1.0, 0]} width={2.8} height={2.4} intensity={0.42} color="#f3f8ff" />
      </>}

      <RoomShell />
      <TravelWall onSelect={onSelect} />
      <GamePoster id="eldenRing" title="ELDEN RING" subtitle="THE GOLDEN ORDER" position={[1.45, 2.35, -3.02]} colors={['#13221e', '#a17b31']} onSelect={onSelect} />
      <GamePoster id="expedition33" title="EXPEDITION 33" subtitle="CLAIR OBSCUR" position={[2.55, 2.35, -3.02]} colors={['#2b241e', '#c8a060']} onSelect={onSelect} />
      <Desk onSelect={onSelect} />
      <Chair />
      <SuitcaseAndSnacks onSelect={onSelect} />
      <Bookshelf onSelect={onSelect} selectedId={selectedId} compact={compact} />
      <Treadmill onSelect={onSelect} />
      <BadmintonWall onSelect={onSelect} />
      <ShoesAndShuttles compact={compact} />
    </>
  )
})

const StableRecordPlayer = memo(RecordPlayer)

function RoomScene({ selectedId, onSelect, resetToken, onReady, isMusicPlaying, whiteboardContent, compact, mobileQuality, onLowPerformance }) {
  const lowPower = compact && mobileQuality === 'low'
  return (
    <>
      <StaticRoom onSelect={onSelect} selectedId={selectedId} compact={compact} lowPower={lowPower} />
      <Whiteboard onSelect={onSelect} content={whiteboardContent} compact={compact} />
      <StableRecordPlayer onSelect={onSelect} playing={isMusicPlaying && !selectedId} />

      <CameraRig selectedId={selectedId} resetToken={resetToken} mobileQuality={mobileQuality} onLowPerformance={onLowPerformance} />
      <SceneReady onReady={onReady} />
    </>
  )
}

function RoomCanvas({ selectedId, onSelect, resetToken, onReady, isMusicPlaying, whiteboardContent }) {
  const compact = useCompactViewport()
  const [mobileQuality, setMobileQuality] = useState(getInitialMobileQuality)
  const lowPower = compact && mobileQuality === 'low'
  const initialHomeView = getHomeView(window.innerWidth, window.innerHeight)
  const glConfig = useMemo(() => ({
    antialias: !lowPower,
    alpha: false,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.08,
    powerPreference: 'high-performance',
    stencil: false,
  }), [lowPower])

  const enableLowPowerMode = useCallback(() => {
    setMobileQuality('low')
    try { window.sessionStorage.setItem('room-mobile-quality', 'low') } catch { /* Keep the downgrade for this render. */ }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.roomQuality = lowPower ? 'low' : 'balanced'
    return () => { delete document.documentElement.dataset.roomQuality }
  }, [lowPower])

  return (
    <div className="room-canvas-shell">
      <Canvas
        frameloop="demand"
        shadows={compact ? false : 'soft'}
        dpr={compact ? (lowPower ? [0.72, 1.15] : [0.82, 1.55]) : [0.68, 1]}
        performance={{ min: 0.75, max: 1, debounce: 180 }}
        camera={{ position: initialHomeView.camera.toArray(), fov: initialHomeView.fov, near: 0.1, far: 60 }}
        gl={glConfig}
        onCreated={({ gl }) => {
          gl.shadowMap.autoUpdate = false
          gl.shadowMap.needsUpdate = true
        }}
        onPointerMissed={() => selectedId && onSelect(null)}
      >
        <RoomScene selectedId={selectedId} onSelect={onSelect} resetToken={resetToken} onReady={onReady} isMusicPlaying={isMusicPlaying} whiteboardContent={whiteboardContent} compact={compact} mobileQuality={mobileQuality} onLowPerformance={enableLowPowerMode} />
      </Canvas>
      <div id="room-hover-label" className="room-hover-label" aria-hidden="true"><i /><span /></div>
    </div>
  )
}

export default memo(RoomCanvas)
