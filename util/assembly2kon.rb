#!/usr/bin/ruby

require 'httparty'
require 'json'
require 'awesome_print'
require 'date'

programs = []
response = HTTParty.get('http://schedule.assembly.org/asms17/schedules/events.json')
asm = JSON.parse(response)

asm["events"].each {|ev|
  loc = asm['locations'][ev['location_key']]

  ts = DateTime.parse(ev['start_time']).to_time
  te = DateTime.parse(ev['end_time']).to_time

  prog = {
    id: ev['key'],
    title: ev['name_fi'],
    desc: ev['description_fi'],
    loc: [loc['name_fi']],
    date: ts.strftime("%Y-%m-%d"),
    time: ts.strftime("%H:%M"),
    mins: ((te-ts)/60).to_i,
    tags: ev['categories'] + ev['flags']
    }

  #ap kon
  programs << prog

}

puts "var program = " + programs.to_json + ";"
