// WSM (Web Sandbox Mode, great name, I know)
// by suss
// basically you can just drag and resize anything because i wanted to do that
// on pc use alt, on mobile pinch like zooming

(() => {
  // toggle off code segment
  if (window._WSMEnabled) {
    window._WSMEnabled = false;
    [
      "mousedown",
      "mousemove",
      "mouseup",
      "touchstart",
      "touchmove",
      "touchend",
      "keydown",
      "keyup",
      "visibilitychange",
    ].forEach((ev) => window.removeEventListener(ev, window["_WSM_" + ev]));

    // interaction restore
    document.body.style.touchAction = "";
    document.body.style.userSelect = "";

    // modified style fix
    (window._WSM_originals || []).forEach((item) => {
      const el = item.el,
        st = item.style;
      Object.entries(st).forEach(([prop, val]) => {
        if (val !== undefined) el.style[prop] = val;
      });
    });

    // scrub the whole webpage agressively
    window._WSM_originals = null;
    window._WSM_state = null;
    alert("We've killed WSM and now all the elements are restored I guess.");
    return;
  }

  // I really dont remember much of what this code does because i just zoned out and coded all this
  // but i think this is the initialization?
  window._WSMEnabled = true;
  window._WSM_originals = [];
  window._WSM_state = { resizeMode: false, touchingTwoFingers: false };

  const originals = new WeakMap(); // store og styles and stuff
  let activeEl = null, // selected element
    mode = "idle", // mode (dragging, idle, resizing etc)
    longPressTimer = null, // long press for mobile
    pinchStart = null, // pinch info
    start = {}; // info when drag begins

  // save styles
  function saveOriginal(el) {
    if (originals.has(el)) return;
    const st = {
      position: el.style.position || "",
      left: el.style.left || "",
      top: el.style.top || "",
      width: el.style.width || "",
      height: el.style.height || "",
      zIndex: el.style.zIndex || "",
      transition: el.style.transition || "",
      pointerEvents: el.style.pointerEvents || "",
      transform: el.style.transform || "",
      cursor: el.style.cursor || "",
    };
    originals.set(el, st);
    window._WSM_originals.push({ el, style: st });
  }

  // touch to page coordinates
  function getPageXYFromTouch(t) {
    return { x: t.clientX + window.scrollX, y: t.clientY + window.scrollY };
  }

  // long press for drag and resize
  function startLongPress(el, e) {
    clearLongPress();
    longPressTimer = setTimeout(() => {
      if (!window._WSMEnabled) return;
      activeEl = el;
      saveOriginal(activeEl);

      const rect = activeEl.getBoundingClientRect();
      const absLeft = rect.left + window.scrollX;
      const absTop = rect.top + window.scrollY;

      // abs pos
      Object.assign(activeEl.style, {
        position: "absolute",
        left: absLeft + "px",
        top: absTop + "px",
        zIndex: 999999,
        transition: "none",
        pointerEvents: "auto",
        transform: "none",
        cursor: "grabbing",
      });

      // store data
      const p =
        e.touches && e.touches[0]
          ? getPageXYFromTouch(e.touches[0])
          : { x: e.pageX, y: e.pageY };

      start = {
        x: p.x,
        y: p.y,
        elLeft: absLeft,
        elTop: absTop,
        elW: rect.width,
        elH: rect.height,
        centerX: absLeft + rect.width / 2,
        centerY: absTop + rect.height / 2,
      };

      // modes
      mode = window._WSM_state.resizeMode ? "resizing" : "dragging";
      document.body.style.userSelect = "none";
      document.body.style.touchAction = "none";
    }, 500);
  }

  // cancel long press timer
  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // spaghetti handlers i am not even going to try to comment this stuff
  window._WSM_keydown = function (e) {
    if (e.code === "AltLeft" || e.code === "AltRight") {
      window._WSM_state.resizeMode = !window._WSM_state.resizeMode;
      console.log("WSM resizeMode =", window._WSM_state.resizeMode);
      if (activeEl && mode === "dragging" && window._WSM_state.resizeMode) {
        mode = "resizing";
        const rect = activeEl.getBoundingClientRect();
        start.elW = rect.width;
        start.elH = rect.height;
        start.centerX =
          rect.left + window.scrollX + rect.width / 2;
        start.centerY =
          rect.top + window.scrollY + rect.height / 2;
      } else if (
        activeEl &&
        mode === "resizing" &&
        !window._WSM_state.resizeMode
      ) {
        mode = "dragging";
      }
    }
  };

  // interaction
  window._WSM_mousedown = window._WSM_touchstart = function (e) {
    if (!window._WSMEnabled) return;

    // pinching 4 mobile
    if (e.touches && e.touches.length === 2) {
      window._WSM_state.touchingTwoFingers = true;
      clearLongPress();
      // basically just checking if youre clicking the same element with two fingers
      const t0 = document.elementFromPoint(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
      const t1 = document.elementFromPoint(
        e.touches[1].clientX,
        e.touches[1].clientY
      );
      if (t0 && t1 && t0 === t1) {
        activeEl = t0;
        saveOriginal(activeEl);
        const rect = activeEl.getBoundingClientRect();
        const absLeft = rect.left + window.scrollX;
        const absTop = rect.top + window.scrollY;
        Object.assign(activeEl.style, {
          position: "absolute",
          left: absLeft + "px",
          top: absTop + "px",
          zIndex: 999999,
          transition: "none",
          pointerEvents: "auto",
          transform: "none",
          cursor: "default",
        });

        // distance between two touches
        pinchStart = {
          distance: Math.hypot(
            e.touches[1].clientX - e.touches[0].clientX,
            e.touches[1].clientY - e.touches[0].clientY
          ),
          rect,
        };
      }
      return;
    }

    const el = e.target;
    startLongPress(el, e);
  };

  // dragging and resizing
  window._WSM_mousemove = window._WSM_touchmove = function (e) {
    if (!window._WSMEnabled || !activeEl || mode === "idle") return;

    if (window._WSM_state.touchingTwoFingers && e.touches && e.touches.length === 2 && pinchStart) {
      const newDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const scale = newDist / pinchStart.distance;
      activeEl.style.width = pinchStart.rect.width * scale + "px";
      activeEl.style.height = pinchStart.rect.height * scale + "px";
      return;
    }

    const p =
      e.touches && e.touches[0]
        ? getPageXYFromTouch(e.touches[0])
        : { x: e.pageX, y: e.pageY };

    if (mode === "dragging") {
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      activeEl.style.left = start.elLeft + dx + "px";
      activeEl.style.top = start.elTop + dy + "px";
    } else if (mode === "resizing") {
      const dx = p.x - start.centerX;
      const dy = p.y - start.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const base = Math.sqrt(
        (start.elW / 2) * (start.elW / 2) + (start.elH / 2) * (start.elH / 2)
      );
      const scale = dist / base;
      activeEl.style.width = start.elW * scale + "px";
      activeEl.style.height = start.elH * scale + "px";
    }
  };

  // release
  window._WSM_mouseup = window._WSM_touchend = function (e) {
    clearLongPress();

    if (window._WSM_state.touchingTwoFingers && (!e.touches || e.touches.length < 2)) {
      window._WSM_state.touchingTwoFingers = false;
      pinchStart = null;
    }

    if (!activeEl) return;
    activeEl.style.cursor = "";
    activeEl = null;
    mode = "idle";
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
  };

  window._WSM_visibilitychange = function () {
    // tab hidden cancellation
    if (document.hidden) {
      activeEl = null;
      mode = "idle";
      clearLongPress();
    }
  };

  // register listeners
  [
    ["mousedown", window._WSM_mousedown],
    ["mousemove", window._WSM_mousemove],
    ["mouseup", window._WSM_mouseup],
    ["touchstart", window._WSM_touchstart],
    ["touchmove", window._WSM_touchmove],
    ["touchend", window._WSM_touchend],
    ["keydown", window._WSM_keydown],
    ["visibilitychange", window._WSM_visibilitychange],
  ].forEach(([ev, fn]) => window.addEventListener(ev, fn));

  console.log("funny thing on (wsm)");
  alert("WSM enabled, hold alt on pc or pinch (like zooming) on mobile to scale and hold to drag. Activate the bookmarklet again to KILL it");
})();
