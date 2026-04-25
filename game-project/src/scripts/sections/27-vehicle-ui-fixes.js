export default String.raw`
        // =========================================================
        // VEHICLE UI FIXES
        // =========================================================
        if (typeof enterArmoredCar === 'function') {
            const _origEnterArmoredCar = enterArmoredCar;
            enterArmoredCar = function () {
                const ok = _origEnterArmoredCar();
                if (ok) {
                    showNotification('Entered armored car — press E to exit');
                }
                return ok;
            };
        }
`;

