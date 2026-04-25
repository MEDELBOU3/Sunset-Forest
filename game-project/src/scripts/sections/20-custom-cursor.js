export default String.raw`
        // =========================================================
        // CUSTOM CURSOR (Smooth + Low-Jank)
        // =========================================================
        const cursor = document.getElementById('cursor');
        let cursorX = window.innerWidth * 0.5;
        let cursorY = window.innerHeight * 0.5;
        let cursorDirty = true;

        function setCursorVisible(visible) {
            cursor.style.display = visible ? 'block' : 'none';
        }

        // Keep cursor visibility in sync with pointer lock
        if (controls && controls.addEventListener) {
            controls.addEventListener('lock', () => setCursorVisible(true));
            controls.addEventListener('unlock', () => setCursorVisible(false));
        }
        setCursorVisible(controls && controls.isLocked);

        document.addEventListener('mousemove', e => {
            if (!controls || !controls.isLocked) return;
            cursorX = e.clientX;
            cursorY = e.clientY;
            cursorDirty = true;
        }, { passive: true });

        function applyCursor() {
            if (controls && controls.isLocked && cursorDirty) {
                cursor.style.transform =
                    'translate3d(' + cursorX + 'px,' + cursorY + 'px,0) translate(-50%, -50%)';
                cursorDirty = false;
            }
            requestAnimationFrame(applyCursor);
        }
        requestAnimationFrame(applyCursor);
`;