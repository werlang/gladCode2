-- gladCode 2.10.0 patch notes.
-- Apply on the PRODUCTION database:
--   docker compose exec -T mysql mysql -u root -p gladcode < public_html/dev-tools/news-2.10.0.sql
-- Verify:
--   SELECT id, title, time FROM news ORDER BY time DESC LIMIT 1;

INSERT INTO `news` (title, post) VALUES ('Atualização - gladCode 2.10.0', '<div>A gladCode foi atualizada para a versão <strong>2.10.0</strong>.</div>
<div>Confira abaixo a lista de mudanças:</div>
<div>&nbsp;</div>
<div><strong>Visualizador 3D (Coliseu)</strong></div>
<ul>
<li>
<div>Adicionado novo renderizador 3D para as batalhas (ativado por padrão), trazendo nova arena, público, efeitos e modelos tridimensionais dos gladiadores.</div>
</li>
<li>
<div>A câmera agora pode ser controlada livremente com o mouse (rotacionar, aproximar e afastar) ou fixada para acompanhar um gladiador.</div>
</li>
<li>
<div>O modo clássico em 2D continua disponível e pode ser selecionado a qualquer momento nas opções do player (ícone de engrenagem).</div>
</li>
</ul>
<div>&nbsp;</div>
<div><strong>Torneios</strong></div>
<ul>
<li>
<div>Gladiadores cujo código apresentar erro de compilação sofrerão derrota automática (<em>forfeit</em>) imediata, evitando o travamento das chaves.</div>
</li>
<li>
<div>Poções foram desabilitadas nos torneios oficiais.</div>
</li>
</ul>
<div>&nbsp;</div>
<div><strong>Simulação e Ranqueadas</strong></div>
<ul>
<li>
<div>Gladiadores cujo código travar em tempo de execução (estouro de memória, falha de segmentação, etc.) agora são eliminados na simulação e sinalizados como quebrados nas ranqueadas, mantendo a integridade da partida.</div>
</li>
</ul>
<div>&nbsp;</div>
<div><strong>Interface</strong></div>
<ul>
<li>
<div>Controles de reprodução do player e barra de tempo ajustados para melhor usabilidade em dispositivos móveis (telas de toque).</div>
</li>
<li>
<div>Página inicial reformulada.</div>
</li>
</ul>
<div>&nbsp;</div>
<div>Obrigado pelo apoio, e não esqueçam de deixar seu feedback.</div>');
