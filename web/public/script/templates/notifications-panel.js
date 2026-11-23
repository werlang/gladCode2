/** NotificationsPanel (css/components/notifications-panel.css): the bell popover. */
export const notificationsPanelTemplate = `
<div class='notifications-panel-inner' role='dialog' aria-label='Notificações'>
    <div class='notifications-panel-head'>
        <strong>Notificações</strong>
        <button class='notifications-panel-read' type='button' data-read-all>Marcar como lidas</button>
    </div>
    <div class='notifications-panel-group' data-group='needs'>
        <span class='notifications-panel-label'>PRECISA DE VOCÊ</span>
        <div class='notifications-panel-list'></div>
    </div>
    <div class='notifications-panel-group' data-group='news'>
        <span class='notifications-panel-label'>NOVIDADES</span>
        <div class='notifications-panel-list'></div>
    </div>
    <p class='notifications-panel-empty' hidden>Nada por aqui.</p>
</div>`;
