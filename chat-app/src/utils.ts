import {secretCombinePairKey} from "./config"
export const createPairName=(slug1:string,slug2:string)=>{
    if(slug1>slug2){
        let combine =[slug1,secretCombinePairKey,slug2]
        return JSON.stringify(combine)
    }
    let combine =[slug2,secretCombinePairKey,slug1]
    return JSON.stringify(combine)
}

export const deCryptPairName=(combinepairName:string)=>{
    let combine=JSON.parse(combinepairName)
    combine.splice(1,1)
    return combine
}

export const checkUserExistInDataBase=(slug,database)=>{

}
