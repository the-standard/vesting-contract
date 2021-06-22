const jsonrpc = '2.0'
const id = 0

// const send = (method, params = []) =>
//   web3.currentProvider.send({ id, jsonrpc, method, params })

// const timeTravel = async seconds => {
//   await send('evm_increaseTime', [seconds])
//   await send('evm_mine')
// }

const timeTravel = async seconds => {
  web3.currentProvider.send({
    jsonrpc: '2.0', 
    method: 'evm_increaseTime', 
    params: [seconds], 
    id: new Date().getSeconds()
  }, (err, resp) => {
    if (!err) {
      web3.currentProvider.send({
        jsonrpc: '2.0', 
        method: 'evm_mine', 
        params: [], 
        id: new Date().getSeconds()
      }, (e,r) => {
        return 123
      })
    }
  })
}
module.exports = timeTravel
