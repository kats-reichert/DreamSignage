/*jslint node: true, esversion: 6*/
"use strict"
const { createLogger, format, transports } = require('winston')
const { combine, timestamp, label, printf } = format
require('winston-daily-rotate-file')

const fileRotateTransport = new transports.DailyRotateFile({
  filename: './log/state-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '7d',
})

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})

const logger = createLogger({
    format: combine(
      timestamp(),
      myFormat
    ),
    transports: [
        new transports.Console(),
        fileRotateTransport
    ]
  })
module.exports = {logger}  
