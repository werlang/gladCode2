/**
 * Dresses every `input.radio` (radio or checkbox) inside a label as the
 * site's round option: the label is wrapped in `div.radio` and gets the ring
 * drawn by css/radio.css.
 *
 * @param {ParentNode} [root] Where to look.
 */
export function decorateRadios(root = document) {
    root.querySelectorAll('label input.radio').forEach(input => {
        const label = input.closest('label');
        if (label.parentElement.classList.contains('radio')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'radio';
        label.before(wrapper);
        wrapper.append(label);
        label.classList.add('option');
        label.insertAdjacentHTML('beforeend', "<div class='border'><div class='inner'></div></div>");
    });
}

/**
 * Turns every `input.checkslider` checkbox into the sliding switch drawn by
 * css/checkboxes.css; the hidden checkbox keeps the state.
 *
 * @param {ParentNode} [root] Where to look.
 */
export function decorateCheckSliders(root = document) {
    root.querySelectorAll('input.checkslider').forEach(input => {
        if (input.nextElementSibling?.classList.contains('trail')) return;
        input.insertAdjacentHTML('afterend', "<div class='checkslider trail'><div class='checkslider thumb'></div></div>");
        input.style.display = 'none';
    });
}
