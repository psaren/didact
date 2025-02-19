// 创建元素的函数
function createElement(type, props, ...children) {
  // 将children转换为对象数组，如果是字符串则转换为文本元素
  const childrenElements = children.map(child =>
    typeof child === "object"
      ? child
      : createTextElement(child)
  );
  // 返回元素对象
  return {
    type,
    props: {
      ...props,
      children: childrenElements, // 包含转换后的children
    },
  }
}

// 创建文本元素的函数
function createTextElement(text) {
  // 返回文本元素对象
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text, // 文本内容
      children: [], // 文本元素没有子元素
    },
  }
}

// 创建DOM元素的函数
function createDom(fiber) {
  // 根据fiber的type创建DOM元素
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("") // 如果是文本元素，创建文本节点
      : document.createElement(fiber.type); // 如果不是文本元素，创建对应的DOM元素

  // 更新DOM元素的属性
  updateDom(dom, {}, fiber.props)

  // 返回创建的DOM元素
  return dom
}

// 检查是否为事件属性
const isEvent = key => key.startsWith("on")
// 检查是否为普通属性
const isProperty = key =>
  key !== "children" && !isEvent(key)
// 检查是否为新属性
const isNew = (prev, next) => key =>
  prev[key] !== next[key]
// 检查是否为已删除的属性
const isGone = (prev, next) => key => !(key in next)
// 更新DOM元素的属性
function updateDom(dom, prevProps, nextProps) {
  // 移除旧的或更改的事件监听器
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    })

  // 移除旧的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })

  // 设置新的或更改的属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // 添加事件监听器
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.addEventListener(
        eventType,
        nextProps[name]
      )
    })
}

// 提交根节点的函数
function commitRoot() {
  // 提交删除的工作
  deletions.forEach(commitWork)
  // 提交当前根节点的工作
  commitWork(wipRoot.child)
  // 更新当前根节点
  currentRoot = wipRoot
  console.log('currentRoot', currentRoot)
  // 重置wipRoot
  wipRoot = null
}

// 提交工作的函数
function commitWork(fiber) {
  if (!fiber) {
    return
  }

  // 寻找父节点的DOM
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // 根据fiber的effectTag执行不同的操作
  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null
  ) {
    domParent.appendChild(fiber.dom)
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent)
  }

  // 递归提交子节点和兄弟节点的工作
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// 删除节点的函数
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

// 渲染元素到容器的函数
function render(element, container) {
  // 初始化wipRoot
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  // 重置删除的节点
  deletions = []
  // 设置下一个工作单元
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

// 工作循环函数，用于执行工作单元
function workLoop(deadline) {
  // 初始化是否需要让出控制权的标志
  let shouldYield = false
  // 当有下一个工作单元且不需要让出控制权时，继续执行
  while (nextUnitOfWork && !shouldYield) {
    // 执行当前工作单元
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    // 检查是否需要让出控制权
    shouldYield = deadline.timeRemaining() < 1
  }

  // 如果没有下一个工作单元且有wipRoot，提交根节点
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  // 请求下一次的空闲回调，继续执行工作循环
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)


// 执行工作单元的函数
function performUnitOfWork(fiber) {
  // 检查是否为函数组件
  const isFunctionComponent =
    fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }
  // 如果有子节点，返回子节点
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    // 如果有兄弟节点，返回兄弟节点
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

let wipFiber = null
let hookIndex = null

// 更新函数组件的函数
function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

// useState钩子的实现
function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

// 更新宿主组件的函数
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

// 调和子节点的函数
function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber =
    wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (
    index < elements.length ||
    oldFiber != null
  ) {
    const element = elements[index]
    let newFiber = null

    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

const Didact = {
  createElement,
  render,
  useState,
}

/** @jsx Didact.createElement */
function Counter() {
  const [state, setState] = Didact.useState(1)
  return (
    <h1 onClick={() => setState(c => c + 1)}>
      Count: {state}
    </h1>
  )
}
const element = <Counter />
const container = document.getElementById("root")
Didact.render(element, container)