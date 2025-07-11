export function handleResize(canvas) {
    const resize = () => {
        var width = window.innerWidth - 170; // Adjust for any fixed sidebar or padding
        var height = window.innerHeight - 200; // Adjust for any fixed header or footer height
        const square = Math.min(width, height)
        // Resize the canvas to fill the window
        canvas.width = square;
        canvas.height = square;
    }
    resize();
    window.addEventListener('resize', resize);
}