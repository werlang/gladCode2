/**
 * TEMPORARY bridge for the classic (non-module) scripts still being moved to
 * ES modules: it publishes the module versions under the old global names a
 * page has not defined itself. Delete it once no page loads a classic script.
 */
import { Message, showDialog, showInput, showMessage, showTerminal, showTextArea } from './components/dialog.js';
import { createToast } from './components/toast.js';
import { Tooltip } from './components/tooltip.js';
import { api } from './helpers/request.js';
import { UserModel } from './models/user.js';

const globals = {
    Message,
    showDialog,
    showInput,
    showMessage,
    showTerminal,
    showTextArea,
    create_toast: createToast,
    post: (path, args) => api.post(path, args),
    waitLogged: () => UserModel.current(),
};

Object.entries(globals).forEach(([name, value]) => {
    if (!(name in window)) window[name] = value;
});

UserModel.current().then(user => {
    window.user = user;
});

Tooltip.install();
