/** Gladiadores section shell (css/profile-glads.css). */
export const gladsShellTemplate = `
<div class='glads-page'>
    <div id='glads-header'></div>
    <div id='glads-grid' class='gladiator-grid'></div>
    <div id='glads-phone' class='glads-phone-list'></div>
    <div id='glads-empty' hidden></div>
</div>`;

/** One filter option label with its count. */
export const gladFilterLabelTemplate = `{{label}} · {{count}}`;


/** One gladiator in the phone list (Mobile.dc.html). */
export const gladsPhoneRowTemplate = `
<a class='glads-phone-row' href='/glad-{{id}}' data-state='{{state}}'>
    <span class='glads-phone-thumb'></span>
    <span class='glads-phone-copy'>
        <span class='glads-phone-name'>{{name}}</span>
        <span class='glads-phone-note'>{{note}}</span>
    </span>
    {{{chevron}}}
</a>`;

/** The dashed new-gladiator row at the end of the phone list. */
export const gladsPhoneNewTemplate = `
<a class='glads-phone-row glads-phone-row--new' href='/newglad'>
    <span class='glads-phone-thumb glads-phone-thumb--new'>{{{plus}}}</span>
    <span class='glads-phone-copy'><span class='glads-phone-name'>Novo gladiador</span><span class='glads-phone-note'>Escolha a aparência e programe o primeiro loop.</span></span>
    {{{chevron}}}
</a>`;
