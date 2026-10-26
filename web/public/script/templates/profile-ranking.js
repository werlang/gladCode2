export const generalHeadTemplate = `<div class='row head'><div class='cell position'></div><div class='cell'>Gladiador</div><div class='cell'>Mestre</div><div class='cell mmr'>Renome</div></div>`;

export const generalPlaceholderTemplate = `
<div class='row dummy'>
    <div class='cell position'><span class='dummy-text'>00°</span></div>
    <div class='cell'><span class='dummy-text'>GLADNAME</span></div>
    <div class='cell'><span class='dummy-text'>USERNAME</span></div>
    <div class='cell mmr'><span class='dummy-text'>0000</span></div>
</div>`;

export const generalRowTemplate = `
<div class='row {{mine}}'>
    <div class='cell position'>{{position}}º</div>
    <div class='cell'>{{glad}}</div>
    <div class='cell'>{{master}}</div>
    <div class='cell mmr'><span class='change24 {{trend}}'>{{{arrow}}}{{change}}</span>{{mmr}}</div>
</div>`;

export const hashtagHeadTemplate = `<div class='row head'><div class='cell position'></div><div class='cell'>Mestre</div><div class='cell mmr'><i class='fas fa-star' title='Pontuação total'></i></div><div class='cell mmr'><i class='fas fa-clock' title='Tempo médio dos treinos'></i></div></div>`;

export const hashtagPlaceholderTemplate = `
<div class='row dummy'>
    <div class='cell position'><span class='dummy-text'>00°</span></div>
    <div class='cell'><span class='dummy-text'>USERNAME</span></div>
    <div class='cell mmr'><span class='dummy-text'>00</span></div>
    <div class='cell mmr'><span class='dummy-text'>000.0s</span></div>
</div>`;

export const hashtagRowTemplate = `
<div class='row {{mine}}'>
    <div class='cell position'>{{position}}º</div>
    <div class='cell'>{{nick}}</div>
    <div class='cell mmr'>{{score}}</div>
    <div class='cell mmr'>{{time}}s</div>
</div>`;

export const emptyRowTemplate = `<div class='row dummy'><div class='cell position'></div><div class='cell'></div><div class='cell'></div><div class='cell mmr'></div></div>`;

export const tabTemplate = `<div class='tab user {{selected}}' role='tab' tabindex='0'>{{name}}</div>`;

export const tutorPitchTemplate = `
<h3>Transforme seu perfil em uma conta de tutor</h3>
<img id='school' src='image/school.png' alt=''>
<p>Adicione e remova tags para monitorar o desempenho de seus alunos nos treinos.</p>
<p>Gere rankings personalizados e aumente o engajamento.</p>`;

export const noCreditTemplate = `
<h3>Você não possui créditos suficientes</h3>
<div id='credit'><i class='fas fa-credit-card'></i></div>
<p>Recarregue seus créditos para poder continuar usando as funções da sua conta de tutor.</p>`;
