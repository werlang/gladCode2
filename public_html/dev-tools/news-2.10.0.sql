-- gladCode 2.10.0 patch notes.
-- Apply on the PRODUCTION database:
--   docker compose exec -T mysql mysql -u root -p --default-character-set=utf8mb4 gladcode < public_html/dev-tools/news-2.10.0.sql
-- Verify:
--   SELECT id, title, time FROM news ORDER BY time DESC LIMIT 1;

SET NAMES utf8mb4;

INSERT INTO `news` (`id`, `title`, `post`) VALUES (24, 'Atualização - gladCode 2.10.0', '<div>A gladCode foi atualizada para a vers&atilde;o <strong>2.10.0</strong>.</div>
<div>Confira abaixo a lista de mudan&ccedil;as:</div>
<div>&nbsp;</div>
<div><strong>Visualizador 3D (Coliseu)</strong></div>
<ul>
<li>
<div>Adicionado novo renderizador 3D para as batalhas (ativado por padr&atilde;o), trazendo nova arena, p&uacute;blico, efeitos e modelos tridimensionais dos gladiadores.</div>
</li>
<li>
<div>A c&acirc;mera agora pode ser controlada livremente com o mouse (rotacionar, aproximar e afastar) ou fixada para acompanhar um gladiador.</div>
</li>
<li>
<div>O modo cl&aacute;ssico em 2D continua dispon&iacute;vel e pode ser selecionado a qualquer momento nas op&ccedil;&otilde;es do player (&iacute;cone de engrenagem).</div>
</li>
</ul>
<div>&nbsp;</div>
<div><strong>Torneios</strong></div>
<ul>
<li>
<div>Gladiadores cujo c&oacute;digo apresentar erro de compila&ccedil;&atilde;o sofrer&atilde;o derrota autom&aacute;tica (<em>forfeit</em>) imediata, evitando o travamento das chaves.</div>
</li>
<li>
<div>Po&ccedil;&otilde;es foram desabilitadas nos torneios oficiais.</div>
</li>
</ul>
<div>&nbsp;</div>
<div><strong>Simula&ccedil;&atilde;o e Ranqueadas</strong></div>
<ul>
<li>
<div>Gladiadores cujo c&oacute;digo travar em tempo de execu&ccedil;&atilde;o (estouro de mem&oacute;ria, falha de segmenta&ccedil;&atilde;o, etc.) agora s&atilde;o eliminados na simula&ccedil;&atilde;o e sinalizados como quebrados nas ranqueadas, mantendo a integridade da partida.</div>
</li>
</ul>
<div>&nbsp;</div>
<div><strong>Interface</strong></div>
<ul>
<li>
<div>Controles de reprodu&ccedil;&atilde;o do player e barra de tempo ajustados para melhor usabilidade em dispositivos m&oacute;veis (telas de toque).</div>
</li>
<li>
<div>P&aacute;gina inicial reformulada.</div>
</li>
</ul>
<div>&nbsp;</div>
<div>Obrigado pelo apoio, e n&atilde;o esque&ccedil;am de deixar seu feedback.</div>')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `post` = VALUES(`post`);
