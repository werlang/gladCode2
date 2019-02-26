# Given a Universal LPC spritesheet, this script uses ImageMagick to look
# through all the animation frames, determines each frame's pixel offset
# relative to a known reference point (e.g. for a hair spritesheet, the
# head would be used as a reference point), and assigns an ID to each unique
# frame.
#
# The purpose is to help you identify whether an existing spritesheet is a
# good candidate to be generated by a script. If there's a relatively small
# number of unique frames (you may need to manually consider things like
# cutouts for bow arms) and each frame is always at a consistent offset
# relative to its reference point (with the possible exception of the "hurt"
# animation), then it's a good candidate.

require File.join(File.dirname(__FILE__), 'utils.rb')
require File.join(File.dirname(__FILE__), 'sheets.rb')

if ARGV.length < 1
  puts "Usage:"
  puts "  #{File.basename(__FILE__)} spritesheet.png"
  exit 1
end

infile = File.expand_path(ARGV[0])
die "File '#{infile}' not found" if !File.file?(infile)

sheet = Sheet[infile]
sheet.warn_if_no_reference_points_sheet
sheet.print_offset_histogram
sheet.print_frames