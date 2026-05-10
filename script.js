document.addEventListener('DOMContentLoaded', () => {
    const missionItems = document.querySelectorAll('.mission-item');
    const thumbItems = document.querySelectorAll('.thumb-item');
    const mainImg = document.querySelector('.main-preview-img');
    const mainText = document.querySelector('.preview-overlay-text');

    // Mission Menu Switching Logic
    missionItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active states
            missionItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Update content with data from attributes
            const newImg = item.getAttribute('data-img');
            const newText = item.getAttribute('data-text');
            
            // Simple fade out effect could be added here, but staying static as per user preference
            if (newImg) mainImg.src = newImg;
            if (newText) mainText.textContent = newText;
            
            // Sync with thumbnails (if the image matches a thumbnail)
            thumbItems.forEach(thumb => {
                if (thumb.getAttribute('data-img') === newImg) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        });
    });

    // Thumbnail Switching Logic
    thumbItems.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // Update active states
            thumbItems.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            
            // Update main image
            const newImg = thumb.getAttribute('data-img');
            if (newImg) mainImg.src = newImg;
            
            // Sync with mission menu if applicable
            missionItems.forEach(item => {
                if (item.getAttribute('data-img') === newImg) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        });
    });
});
