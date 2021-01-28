type LogType = 'request' | 'error' | 'success'

type Log = {
    ticket: string
    type: LogType
    clientIp: string
    function: string
    args: object
    createdAt: Date
    result: string
}

let ticketNo = 0
const increaseTicketNo = () => ticketNo++


export { Log, ticketNo,increaseTicketNo,LogType}

