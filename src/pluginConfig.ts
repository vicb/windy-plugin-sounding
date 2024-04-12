import type { ExternalPluginConfig } from '@windy/interfaces';
// TODO: import pkg
//import pkg from '../package.json';

const config: ExternalPluginConfig = {
    author: "Victor Berchet",
    name: "windy-plugin-sounding",
    version: "3.0.4",
    description: "Soundings for paraglider pilots",
    repository: "git+https://github.com/vicb/windy-plugin-sounding",
    title: 'Better Soundings',
    icon: '⛅️',
    desktopUI: 'rhpane',
    mobileUI: 'small',
    routerPath: '/sdg/:lat?/:lon?',
    desktopWidth: 600,
    addToContextmenu: true,
    listenToSingleclick: true,    
};

export default config;
