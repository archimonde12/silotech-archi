const lock = (function () {

    let value:boolean = false;

    return {
        changeLock: function (_lockValue:boolean):void {
            value = _lockValue
        },
        value: ():boolean => value
    };
    
})();

export {lock}