'use strict';
const {resolve}=require('node:path');
const icon=resolve(__dirname,'assets','happy-coding.ico');

module.exports={
  packagerConfig:{
    asar:true,
    name:'Happy Coding',
    executableName:'HappyCoding',
    icon
  },
  rebuildConfig:{},
  makers:[
    {
      name:'@electron-forge/maker-squirrel',
      config:{
        name:'happy_coding',
        authors:'Happy Coding',
        description:'Happy Coding =] desktop browser',
        setupExe:'HappyCoding-Setup.exe',
        setupIcon:icon,
        noMsi:true
      }
    },
    {
      name:'@electron-forge/maker-zip',
      platforms:['win32']
    }
  ]
};
