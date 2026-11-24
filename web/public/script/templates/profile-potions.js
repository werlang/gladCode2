/** Poções section shell (css/profile-potions.css). */
export const potionsShellTemplate = `
<div class='potions-page'>
    <div id='potions-header'></div>
    <section class='apothecary-band' aria-label='Apotecário'>
        <div class='apothecary-top'>
            <div class='apothecary-copy'>
                <span class='apothecary-kicker'>APOTECÁRIO</span>
                <h2 class='apothecary-title'></h2>
            </div>
            <div class='apothecary-next'>
                <span class='apothecary-next-copy'>
                    <span class='apothecary-next-duration'></span>
                    <span class='apothecary-next-price'>{{{coin}}}<span></span></span>
                </span>
                <button type='button' id='upgrade' class='button primary'>Aprimorar</button>
            </div>
        </div>
        <div id='potion-slots' class='potion-slots'></div>
    </section>
    <section class='potion-shop'>
        <div class='potion-shop-head'>
            <h2>Encomendar</h2>
            <div id='potion-filters'></div>
        </div>
        <div id='potion-cards' class='potion-cards'></div>
        <p id='potion-empty' class='potion-shop-empty' hidden>Nenhuma poção desta categoria.</p>
    </section>
</div>`;
