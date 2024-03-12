import type { ExternalPluginConfig } from '@windy/interfaces';
// TODO: import pkg
//import pkg from '../package.json';


const config: ExternalPluginConfig = {
    author: "Victor Berchet",
    name: "windy-plugin-sounding",
    version: "3.0.0",
    description: "TODO",
    repository: "TODO",
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
