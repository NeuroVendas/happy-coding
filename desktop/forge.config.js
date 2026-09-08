'use strict';

module.exports={
  packagerConfig:{
    asar:true,
    name:'Happy Coding',
    executableName:'HappyCoding'
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
        noMsi:true
      }
    },
    {
      name:'@electron-forge/maker-zip',
      platforms:['win32']
    }
  ]
};
