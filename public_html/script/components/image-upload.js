import { DynamicScript } from '../helpers/dynamic-script.js';

const WIDGET_URL = 'https://widget.cloudinary.com/v2.0/global/all.js';

/** Cloudinary upload widget settings, in the site's colours. */
const WIDGET_OPTIONS = {
    cloudName: 'dd0mjuhdb',
    uploadPreset: 'fvbkdtsp',
    sources: ['local', 'url', 'camera', 'facebook', 'dropbox', 'instagram'],
    showAdvancedOptions: false,
    cropping: false,
    multiple: false,
    defaultSource: 'local',
    styles: {
        palette: {
            window: '#FFFFFF',
            windowBorder: '#90A0B3',
            tabIcon: '#00638D',
            menuIcons: '#5A616A',
            textDark: '#000000',
            textLight: '#FFFFFF',
            link: '#00638D',
            action: '#FF620C',
            inactiveTabIcon: '#0E2F5A',
            error: '#F44235',
            inProgress: '#0078FF',
            complete: '#20B832',
            sourceBg: '#E4EBF1',
        },
        fonts: {
            default: null,
            "'Roboto', sans-serif": {
                url: 'https://fonts.googleapis.com/css?family=Roboto&display=swap',
                active: true,
            },
        },
    },
};

let widget = null;
/** Settles the upload in progress. */
let settle = null;

/**
 * Opens the Cloudinary upload widget.
 *
 * @returns {Promise<string|false>} The uploaded image URL, or `false` when the
 *   widget was closed or failed.
 */
export async function uploadImage() {
    await new DynamicScript(WIDGET_URL).load();
    widget ??= cloudinary.createUploadWidget(WIDGET_OPTIONS, (error, result) => {
        if (error) settle?.(false);
        else if (result.event === 'success') settle?.(result.info.secure_url);
        else if (result.event === 'close') settle?.(false);
    });

    return new Promise(resolve => {
        settle = url => {
            settle = null;
            resolve(url);
        };
        widget.open();
    });
}
