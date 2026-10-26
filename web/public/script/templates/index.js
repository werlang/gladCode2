/** YouTube player modal of the front page video cards. */
export const videoModalTemplate = `
<div id='fog'>
    <div id='video-container' role='dialog' aria-label='Vídeo'>
        <iframe src='https://www.youtube.com/embed/{{hash}}?autoplay=1' allow='autoplay; encrypted-media' allowfullscreen></iframe>
        <button id='remove' aria-label='Fechar vídeo'></button>
    </div>
</div>`;
