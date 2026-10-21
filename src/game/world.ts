// ============================================================
// ENGLISH FOOTBALL WORLD — 2026/27
// 4 divisions: Premier League → Championship → League One → League Two
// Real club names throughout. Real player anchors where confirmed,
// generated players fill remaining squad slots.
// EDIT LEAGUE SEEDS BELOW to update club/player data.
// ============================================================

import type {
  Club, League, Player, PlayerContract, Position,
  StandingRow, TacticStyle, Nationality,
} from './types';
import { RNG, clampAttribute } from './rng';
import { generateAttributes, generatePotential } from './attributes';
import { computeOverall } from './positions';

// ------------------------------------------------------------
// SEED TYPES
// ------------------------------------------------------------

interface RealPlayerSeed { name: string; pos: Position; }

interface ClubSeed {
  name: string;
  shortName: string;
  abbreviation: string;
  stadium: string;
  reputation: number;    // 1-100 → drives squad quality
  finances: number;      // 1-100
  primaryColor: string;
  secondaryColor: string;
  tactic: TacticStyle;
  formation: string;
  managerName: string;
  realPlayers: RealPlayerSeed[];
}

interface LeagueSeed {
  id: string;
  name: string;
  tier: number;
  clubs: ClubSeed[];
}

// ------------------------------------------------------------
// PREMIER LEAGUE 2026/27 (20 clubs)
// ------------------------------------------------------------

const PREMIER_LEAGUE: LeagueSeed = {
  id: 'league_epl',
  name: 'Premier League',
  tier: 1,
  clubs: [
    { name: 'Arsenal', shortName: 'Arsenal', abbreviation: 'ARS', stadium: 'Emirates Stadium', reputation: 92, finances: 88, primaryColor: '#EF0107', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-3-3', managerName: 'Mikel Arteta', realPlayers: [
      { name: 'David Raya', pos: 'GK' },
      { name: 'William Saliba', pos: 'CB' },
      { name: 'Gabriel Magalhães', pos: 'CB' },
      { name: 'Declan Rice', pos: 'CM' },
      { name: 'Martin Ødegaard', pos: 'AM' },
      { name: 'Bukayo Saka', pos: 'RW' },
      { name: 'Kai Havertz', pos: 'ST' },
      { name: 'Viktor Gyökeres', pos: 'ST' },
      { name: 'Eberechi Eze', pos: 'AM' },
    ] },
    { name: 'Aston Villa', shortName: 'Aston Villa', abbreviation: 'AVL', stadium: 'Villa Park', reputation: 80, finances: 76, primaryColor: '#95BFE5', secondaryColor: '#670E36', tactic: 'Counter', formation: '4-2-3-1', managerName: 'Unai Emery', realPlayers: [
      { name: 'Emiliano Buendía', pos: 'AM' },
      { name: 'John McGinn', pos: 'CM' },
      { name: 'Tyrone Mings', pos: 'CB' },
      { name: 'Leon Goretzka', pos: 'CM' },
      { name: 'Aaron Wan-Bissaka', pos: 'RB' },
      { name: 'Nicolas Jackson', pos: 'ST' },
      { name: 'Alejandro Garnacho', pos: 'LW' },
    ] },
    { name: 'AFC Bournemouth', shortName: 'Bournemouth', abbreviation: 'BOU', stadium: 'Vitality Stadium', reputation: 70, finances: 64, primaryColor: '#DA291C', secondaryColor: '#000000', tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Andoni Iraola', realPlayers: [
      { name: 'Đorđe Petrović', pos: 'GK' },
      { name: 'Lewis Cook', pos: 'CM' },
      { name: 'Justin Kluivert', pos: 'AM' },
      { name: 'Evanilson', pos: 'ST' },
      { name: 'David Brooks', pos: 'RW' },
      { name: 'Tyler Adams', pos: 'DM' },
      { name: 'Antoine Semenyo', pos: 'LW' },
    ] },
    { name: 'Brentford', shortName: 'Brentford', abbreviation: 'BRE', stadium: 'Gtech Community Stadium', reputation: 70, finances: 64, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-3-3', managerName: 'Keith Andrews', realPlayers: [
      { name: 'Caoimhín Kelleher', pos: 'GK' },
      { name: 'Nathan Collins', pos: 'CB' },
      { name: 'Mathias Jensen', pos: 'CM' },
      { name: 'Kevin Schade', pos: 'LW' },
      { name: 'Igor Thiago', pos: 'ST' },
      { name: 'Mikkel Damsgaard', pos: 'AM' },
    ] },
    { name: 'Brighton & Hove Albion', shortName: 'Brighton', abbreviation: 'BHA', stadium: 'American Express Stadium', reputation: 80, finances: 72, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Fabian Hürzeler', realPlayers: [
      { name: 'Bart Verbruggen', pos: 'GK' },
      { name: 'Lewis Dunk', pos: 'CB' },
      { name: 'Pascal Gross', pos: 'CM' },
      { name: 'Kaoru Mitoma', pos: 'LW' },
      { name: 'Georginio Rutter', pos: 'AM' },
      { name: 'Yankuba Minteh', pos: 'RW' },
      { name: 'Evan Ferguson', pos: 'ST' },
    ] },
    { name: 'Chelsea', shortName: 'Chelsea', abbreviation: 'CHE', stadium: 'Stamford Bridge', reputation: 88, finances: 90, primaryColor: '#034694', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Enzo Maresca', realPlayers: [
      { name: 'Emiliano Martínez', pos: 'GK' },
      { name: 'Reece James', pos: 'RB' },
      { name: 'Levi Colwill', pos: 'CB' },
      { name: 'Moisés Caicedo', pos: 'DM' },
      { name: 'Cole Palmer', pos: 'AM' },
      { name: 'Pedro Neto', pos: 'RW' },
      { name: 'João Pedro', pos: 'ST' },
      { name: 'Romeo Lavia', pos: 'CM' },
      { name: 'Morgan Rogers', pos: 'AM' },
    ] },
    { name: 'Coventry City', shortName: 'Coventry', abbreviation: 'COV', stadium: 'Coventry Building Society Arena', reputation: 62, finances: 56, primaryColor: '#78D0F3', secondaryColor: '#000000', tactic: 'Balanced', formation: '4-4-2', managerName: 'Frank Lampard', realPlayers: [
      { name: 'Ethan Pinnock', pos: 'CB' },
    ] },
    { name: 'Crystal Palace', shortName: 'Crystal Palace', abbreviation: 'CRY', stadium: 'Selhurst Park', reputation: 72, finances: 66, primaryColor: '#1B458F', secondaryColor: '#C4122E', tactic: 'Counter', formation: '3-4-2-1', managerName: 'Oliver Glasner', realPlayers: [
      { name: 'Dean Henderson', pos: 'GK' },
      { name: 'Marc Guéhi', pos: 'CB' },
      { name: 'Eberechi Eze', pos: 'AM' },
    ] },
    { name: 'Everton', shortName: 'Everton', abbreviation: 'EVE', stadium: 'Hill Dickinson Stadium', reputation: 74, finances: 68, primaryColor: '#003399', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '4-4-2', managerName: 'David Moyes', realPlayers: [
      { name: 'Jordan Pickford', pos: 'GK' },
      { name: 'Jarrad Branthwaite', pos: 'CB' },
      { name: 'Iliman Ndiaye', pos: 'AM' },
    ] },
    { name: 'Fulham', shortName: 'Fulham', abbreviation: 'FUL', stadium: 'Craven Cottage', reputation: 72, finances: 70, primaryColor: '#FFFFFF', secondaryColor: '#000000', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Marco Silva', realPlayers: [
      { name: 'Bernd Leno', pos: 'GK' },
      { name: 'Antonee Robinson', pos: 'LB' },
      { name: 'Calvin Bassey', pos: 'CB' },
      { name: 'Sander Berge', pos: 'CM' },
      { name: 'Emile Smith Rowe', pos: 'AM' },
      { name: 'Alex Iwobi', pos: 'RW' },
      { name: 'Rodrigo Muniz', pos: 'ST' },
    ] },
    { name: 'Hull City', shortName: 'Hull', abbreviation: 'HUL', stadium: 'KCOM Stadium', reputation: 62, finances: 56, primaryColor: '#F5A12D', secondaryColor: '#000000', tactic: 'Direct', formation: '4-4-2', managerName: 'Sergej Jakirović', realPlayers: [
      { name: 'Jack Butland', pos: 'GK' },
      { name: 'Mohamed Belloumi', pos: 'RW' },
      { name: 'Regan Slater', pos: 'CM' },
      { name: 'Ollie McBurnie', pos: 'ST' },
      { name: 'Matt Crooks', pos: 'CM' },
      { name: 'Hidemasa Morita', pos: 'DM' },
      { name: 'Joe Gelhardt', pos: 'ST' },
    ] },
    { name: 'Ipswich Town', shortName: 'Ipswich', abbreviation: 'IPS', stadium: 'Portman Road', reputation: 62, finances: 56, primaryColor: '#0044A9', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Kieran McKenna', realPlayers: [] },
    { name: 'Leeds United', shortName: 'Leeds', abbreviation: 'LEE', stadium: 'Elland Road', reputation: 68, finances: 60, primaryColor: '#FFFFFF', secondaryColor: '#1D428A', tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Daniel Farke', realPlayers: [
      { name: 'Ethan Ampadu', pos: 'DM' },
      { name: 'Brenden Aaronson', pos: 'AM' },
    ] },
    { name: 'Liverpool', shortName: 'Liverpool', abbreviation: 'LIV', stadium: 'Anfield', reputation: 91, finances: 88, primaryColor: '#C8102E', secondaryColor: '#F6EB61', tactic: 'HighPress', formation: '4-3-3', managerName: 'Arne Slot', realPlayers: [
      { name: 'Alisson', pos: 'GK' },
      { name: 'Virgil van Dijk', pos: 'CB' },
      { name: 'Mohamed Salah', pos: 'RW' },
      { name: 'Alexis Mac Allister', pos: 'CM' },
      { name: 'Ryan Gravenberch', pos: 'DM' },
      { name: 'Florian Wirtz', pos: 'AM' },
    ] },
    { name: 'Manchester City', shortName: 'Man City', abbreviation: 'MCI', stadium: 'Etihad Stadium', reputation: 95, finances: 95, primaryColor: '#6CABDD', secondaryColor: '#1C2C5B', tactic: 'Possession', formation: '4-3-3', managerName: 'Pep Guardiola', realPlayers: [
      { name: 'Erling Haaland', pos: 'ST' },
      { name: 'Rodri', pos: 'DM' },
      { name: 'Phil Foden', pos: 'AM' },
      { name: 'Rúben Dias', pos: 'CB' },
    ] },
    { name: 'Manchester United', shortName: 'Man Utd', abbreviation: 'MUN', stadium: 'Old Trafford', reputation: 87, finances: 85, primaryColor: '#DA291C', secondaryColor: '#FBE122', tactic: 'Direct', formation: '3-4-2-1', managerName: 'Rúben Amorim', realPlayers: [
      { name: 'Bruno Fernandes', pos: 'AM' },
      { name: 'Kobbie Mainoo', pos: 'CM' },
      { name: 'Matthijs de Ligt', pos: 'CB' },
    ] },
    { name: 'Newcastle United', shortName: 'Newcastle', abbreviation: 'NEW', stadium: "St James' Park", reputation: 81, finances: 78, primaryColor: '#241F20', secondaryColor: '#FFFFFF', tactic: 'HighPress', formation: '4-3-3', managerName: 'Eddie Howe', realPlayers: [
      { name: 'Alexander Isak', pos: 'ST' },
      { name: 'Bruno Guimarães', pos: 'CM' },
      { name: 'Sandro Tonali', pos: 'DM' },
      { name: 'Anthony Gordon', pos: 'LW' },
    ] },
    { name: 'Nottingham Forest', shortName: 'Nottm Forest', abbreviation: 'NFO', stadium: 'City Ground', reputation: 72, finances: 68, primaryColor: '#DD0000', secondaryColor: '#FFFFFF', tactic: 'Counter', formation: '4-2-3-1', managerName: 'Nuno Espírito Santo', realPlayers: [
      { name: 'Morgan Gibbs-White', pos: 'AM' },
      { name: 'Murillo', pos: 'CB' },
      { name: 'Chris Wood', pos: 'ST' },
    ] },
    { name: 'Sunderland', shortName: 'Sunderland', abbreviation: 'SUN', stadium: 'Stadium of Light', reputation: 65, finances: 58, primaryColor: '#EB172B', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Régis Le Bris', realPlayers: [
      { name: 'Jobe Bellingham', pos: 'CM' },
      { name: 'Dan Neil', pos: 'CM' },
    ] },
    { name: 'Tottenham Hotspur', shortName: 'Spurs', abbreviation: 'TOT', stadium: 'Tottenham Hotspur Stadium', reputation: 84, finances: 82, primaryColor: '#132257', secondaryColor: '#FFFFFF', tactic: 'HighPress', formation: '4-3-3', managerName: 'Thomas Frank', realPlayers: [
      { name: 'James Maddison', pos: 'AM' },
      { name: 'Cristian Romero', pos: 'CB' },
      { name: 'Dominic Solanke', pos: 'ST' },
    ] },
  ],
};

// ------------------------------------------------------------
// EFL CHAMPIONSHIP (24 clubs, real names)
// ------------------------------------------------------------

const CHAMPIONSHIP: LeagueSeed = {
  id: 'league_champ',
  name: 'EFL Championship',
  tier: 2,
  clubs: [
    { name: 'Sheffield United', shortName: 'Sheff Utd', abbreviation: 'SHU', stadium: 'Bramall Lane', reputation: 58, finances: 52, primaryColor: '#EE2737', secondaryColor: '#000000', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Chris Wilder', realPlayers: [
      { name: 'Tyrese Campbell', pos: 'ST' },
      { name: "Callum O'Hare", pos: 'AM' },
    ] },
    { name: 'Derby County', shortName: 'Derby', abbreviation: 'DER', stadium: 'Pride Park', reputation: 55, finances: 48, primaryColor: '#FFFFFF', secondaryColor: '#000000', tactic: 'Balanced', formation: '4-3-3', managerName: 'John Eustace', realPlayers: [
      { name: 'Patrick Agyemang', pos: 'ST' },
      { name: 'Sam Szmodics', pos: 'AM' },
    ] },
    { name: 'Southampton', shortName: 'Southampton', abbreviation: 'SOU', stadium: "St Mary's Stadium", reputation: 56, finances: 50, primaryColor: '#D71920', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-3-3', managerName: 'Will Still', realPlayers: [] },
    { name: 'Middlesbrough', shortName: 'Boro', abbreviation: 'MID', stadium: 'Riverside Stadium', reputation: 54, finances: 46, primaryColor: '#E21C38', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Rob Edwards', realPlayers: [] },
    { name: 'Bristol City', shortName: 'Bristol City', abbreviation: 'BRC', stadium: 'Ashton Gate', reputation: 50, finances: 44, primaryColor: '#E31B23', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Gerhard Struber', realPlayers: [] },
    { name: 'Swansea City', shortName: 'Swansea', abbreviation: 'SWA', stadium: 'Swansea.com Stadium', reputation: 48, finances: 42, primaryColor: '#FFFFFF', secondaryColor: '#000000', tactic: 'Possession', formation: '4-3-3', managerName: 'Alan Sheehan', realPlayers: [] },
    { name: 'Norwich City', shortName: 'Norwich', abbreviation: 'NOR', stadium: 'Carrow Road', reputation: 52, finances: 46, primaryColor: '#FFF200', secondaryColor: '#00A650', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Liam Manning', realPlayers: [] },
    { name: 'Watford', shortName: 'Watford', abbreviation: 'WAT', stadium: 'Vicarage Road', reputation: 50, finances: 44, primaryColor: '#FBEE23', secondaryColor: '#ED2127', tactic: 'Counter', formation: '4-4-2', managerName: 'Tom Cleverley', realPlayers: [] },
    { name: 'Burnley', shortName: 'Burnley', abbreviation: 'BUR', stadium: 'Turf Moor', reputation: 54, finances: 48, primaryColor: '#6C1D45', secondaryColor: '#99D6EA', tactic: 'Direct', formation: '4-4-2', managerName: 'Scott Parker', realPlayers: [] },
    { name: 'Portsmouth', shortName: 'Portsmouth', abbreviation: 'POR', stadium: 'Fratton Park', reputation: 46, finances: 40, primaryColor: '#001489', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'John Mousinho', realPlayers: [] },
    { name: 'Blackburn Rovers', shortName: 'Blackburn', abbreviation: 'BLB', stadium: 'Ewood Park', reputation: 46, finances: 40, primaryColor: '#009EE0', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Valérien Ismaël', realPlayers: [] },
    { name: 'Millwall', shortName: 'Millwall', abbreviation: 'MIL', stadium: 'The Den', reputation: 44, finances: 38, primaryColor: '#001D5E', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Alex Neil', realPlayers: [] },
    { name: 'Queens Park Rangers', shortName: 'QPR', abbreviation: 'QPR', stadium: 'Loftus Road', reputation: 44, finances: 38, primaryColor: '#1D5BA4', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-3-3', managerName: 'Martí Cifuentes', realPlayers: [] },
    { name: 'Cardiff City', shortName: 'Cardiff', abbreviation: 'CAR', stadium: 'Cardiff City Stadium', reputation: 42, finances: 36, primaryColor: '#0070B5', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Brian Barry-Murphy', realPlayers: [] },
    { name: 'Charlton Athletic', shortName: 'Charlton', abbreviation: 'CHA', stadium: 'The Valley', reputation: 40, finances: 34, primaryColor: '#D4021D', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Nathan Jones', realPlayers: [] },
    { name: 'Preston North End', shortName: 'Preston', abbreviation: 'PNE', stadium: 'Deepdale', reputation: 42, finances: 36, primaryColor: '#FFFFFF', secondaryColor: '#1B3A6B', tactic: 'LowBlock', formation: '5-3-2', managerName: 'Paul Heckingbottom', realPlayers: [] },
    { name: 'Stoke City', shortName: 'Stoke', abbreviation: 'STK', stadium: 'bet365 Stadium', reputation: 46, finances: 40, primaryColor: '#E03A3E', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Mark Robins', realPlayers: [] },
    { name: 'West Bromwich Albion', shortName: 'West Brom', abbreviation: 'WBA', stadium: 'The Hawthorns', reputation: 48, finances: 42, primaryColor: '#122F67', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Tony Mowbray', realPlayers: [] },
    { name: 'Sheffield Wednesday', shortName: 'Sheff Wed', abbreviation: 'SHW', stadium: 'Hillsborough', reputation: 44, finances: 38, primaryColor: '#0033A0', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'Danny Röhl', realPlayers: [] },
    { name: 'Oxford United', shortName: 'Oxford', abbreviation: 'OXF', stadium: 'Kassam Stadium', reputation: 40, finances: 34, primaryColor: '#F5D313', secondaryColor: '#1D3C6E', tactic: 'Direct', formation: '4-4-2', managerName: 'Gary Rowett', realPlayers: [] },
    { name: 'Luton Town', shortName: 'Luton', abbreviation: 'LUT', stadium: 'Kenilworth Road', reputation: 44, finances: 38, primaryColor: '#F78F1E', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Matt Bloomfield', realPlayers: [] },
    { name: 'Huddersfield Town', shortName: 'Huddersfield', abbreviation: 'HUD', stadium: "John Smith's Stadium", reputation: 42, finances: 36, primaryColor: '#00AEEF', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Michael Duff', realPlayers: [] },
    { name: 'Bolton Wanderers', shortName: 'Bolton', abbreviation: 'BOL', stadium: 'Toughsheet Community Stadium', reputation: 38, finances: 32, primaryColor: '#FFFFFF', secondaryColor: '#1D3C6E', tactic: 'Direct', formation: '4-4-2', managerName: 'Steven Schumacher', realPlayers: [] },
    { name: 'Wigan Athletic', shortName: 'Wigan', abbreviation: 'WIG', stadium: 'DW Stadium', reputation: 38, finances: 32, primaryColor: '#0033A0', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Shaun Maloney', realPlayers: [] },
  ],
};

// ------------------------------------------------------------
// EFL LEAGUE ONE (24 clubs, real names)
// ------------------------------------------------------------

const LEAGUE_ONE: LeagueSeed = {
  id: 'league_l1',
  name: 'EFL League One',
  tier: 3,
  clubs: [
    { name: 'Leicester City', shortName: 'Leicester', abbreviation: 'LEI', stadium: 'King Power Stadium', reputation: 48, finances: 42, primaryColor: '#003090', secondaryColor: '#FDBE11', tactic: 'Possession', formation: '4-3-3', managerName: 'Marten de Roon', realPlayers: [] },
    { name: 'Barnsley', shortName: 'Barnsley', abbreviation: 'BAR', stadium: 'Oakwell', reputation: 38, finances: 32, primaryColor: '#D71920', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Conor Hourihane', realPlayers: [] },
    { name: 'Blackpool', shortName: 'Blackpool', abbreviation: 'BLA', stadium: 'Bloomfield Road', reputation: 36, finances: 30, primaryColor: '#F68712', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Steve Bruce', realPlayers: [] },
    { name: 'Bradford City', shortName: 'Bradford', abbreviation: 'BRA', stadium: 'Valley Parade', reputation: 34, finances: 28, primaryColor: '#FDB913', secondaryColor: '#8B1E2B', tactic: 'Direct', formation: '4-4-2', managerName: 'Graham Alexander', realPlayers: [] },
    { name: 'Burton Albion', shortName: 'Burton', abbreviation: 'BUR', stadium: 'Pirelli Stadium', reputation: 32, finances: 26, primaryColor: '#F5A12D', secondaryColor: '#000000', tactic: 'LowBlock', formation: '4-4-2', managerName: 'Gary Bowyer', realPlayers: [] },
    { name: 'Doncaster Rovers', shortName: 'Doncaster', abbreviation: 'DON', stadium: 'Eco-Power Stadium', reputation: 30, finances: 26, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Grant McCann', realPlayers: [] },
    { name: 'AFC Wimbledon', shortName: 'Wimbledon', abbreviation: 'WIM', stadium: 'Plough Lane', reputation: 30, finances: 26, primaryColor: '#1D3C6E', secondaryColor: '#F5D313', tactic: 'Direct', formation: '4-4-2', managerName: 'Johnnie Jackson', realPlayers: [] },
    { name: 'Cambridge United', shortName: 'Cambridge', abbreviation: 'CAM', stadium: 'Abbey Stadium', reputation: 28, finances: 24, primaryColor: '#F5A12D', secondaryColor: '#000000', tactic: 'LowBlock', formation: '4-4-2', managerName: 'Neil Harris', realPlayers: [] },
    { name: 'Leyton Orient', shortName: 'Leyton Orient', abbreviation: 'LEY', stadium: 'Brisbane Road', reputation: 30, finances: 26, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Richie Wellens', realPlayers: [] },
    { name: 'Reading', shortName: 'Reading', abbreviation: 'REA', stadium: 'Select Car Leasing Stadium', reputation: 34, finances: 28, primaryColor: '#004494', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Noel Hunt', realPlayers: [] },
    { name: 'Stevenage', shortName: 'Stevenage', abbreviation: 'STE', stadium: 'Lamex Stadium', reputation: 26, finances: 22, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '5-3-2', managerName: 'Alex Revell', realPlayers: [] },
    { name: 'Mansfield Town', shortName: 'Mansfield', abbreviation: 'MAN', stadium: 'Field Mill', reputation: 26, finances: 22, primaryColor: '#F5D313', secondaryColor: '#1D3C6E', tactic: 'Direct', formation: '4-4-2', managerName: 'Nigel Clough', realPlayers: [] },
    { name: 'Plymouth Argyle', shortName: 'Plymouth', abbreviation: 'PLY', stadium: 'Home Park', reputation: 32, finances: 26, primaryColor: '#007B5F', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Miron Muslic', realPlayers: [] },
    { name: 'Rotherham United', shortName: 'Rotherham', abbreviation: 'ROT', stadium: 'New York Stadium', reputation: 32, finances: 26, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Steve Evans', realPlayers: [] },
    { name: 'Northampton Town', shortName: 'Northampton', abbreviation: 'NOR', stadium: 'Sixfields Stadium', reputation: 26, finances: 22, primaryColor: '#8B1E2B', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Jon Brady', realPlayers: [] },
    { name: 'Exeter City', shortName: 'Exeter', abbreviation: 'EXE', stadium: 'St James Park', reputation: 28, finances: 24, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Gary Caldwell', realPlayers: [] },
    { name: 'Lincoln City', shortName: 'Lincoln', abbreviation: 'LIN', stadium: 'Sincil Bank', reputation: 30, finances: 26, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Michael Skubala', realPlayers: [] },
    { name: 'Peterborough United', shortName: 'Peterborough', abbreviation: 'PET', stadium: 'London Road', reputation: 34, finances: 28, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-3-3', managerName: 'Darren Ferguson', realPlayers: [] },
    { name: 'Stockport County', shortName: 'Stockport', abbreviation: 'STO', stadium: 'Edgeley Park', reputation: 30, finances: 26, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Dave Challinor', realPlayers: [] },
    { name: 'Wycombe Wanderers', shortName: 'Wycombe', abbreviation: 'WYC', stadium: 'Adams Park', reputation: 28, finances: 24, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Mike Dodds', realPlayers: [] },
    { name: 'Wrexham', shortName: 'Wrexham', abbreviation: 'WRE', stadium: 'Racecourse Ground', reputation: 32, finances: 30, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Phil Parkinson', realPlayers: [] },
    { name: 'Port Vale', shortName: 'Port Vale', abbreviation: 'PVL', stadium: 'Vale Park', reputation: 26, finances: 22, primaryColor: '#FFFFFF', secondaryColor: '#000000', tactic: 'Balanced', formation: '4-4-2', managerName: 'Darren Moore', realPlayers: [] },
    { name: 'Bristol Rovers', shortName: 'Bristol Rovers', abbreviation: 'BRR', stadium: 'Memorial Stadium', reputation: 28, finances: 24, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Darrell Clarke', realPlayers: [] },
    { name: 'Blackpool', shortName: 'Blackpool', abbreviation: 'BLP', stadium: 'Bloomfield Road', reputation: 30, finances: 26, primaryColor: '#F68712', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Steve Bruce', realPlayers: [] },
  ],
};

// ------------------------------------------------------------
// EFL LEAGUE TWO (24 clubs, real names)
// ------------------------------------------------------------

const LEAGUE_TWO: LeagueSeed = {
  id: 'league_l2',
  name: 'EFL League Two',
  tier: 4,
  clubs: [
    { name: 'Grimsby Town', shortName: 'Grimsby', abbreviation: 'GRI', stadium: 'Blundell Park', reputation: 26, finances: 22, primaryColor: '#000000', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'David Artell', realPlayers: [
      { name: 'Danny Rose', pos: 'ST' },
      { name: 'Kieran Green', pos: 'CM' },
      { name: 'Jordan Davies', pos: 'CM' },
      { name: 'Christy Pym', pos: 'GK' },
    ] },
    { name: 'Fleetwood Town', shortName: 'Fleetwood', abbreviation: 'FLE', stadium: 'Highbury Stadium', reputation: 24, finances: 20, primaryColor: '#D71920', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '4-4-2', managerName: 'Pete Wild', realPlayers: [] },
    { name: 'Accrington Stanley', shortName: 'Accrington', abbreviation: 'ACC', stadium: 'Wham Stadium', reputation: 22, finances: 18, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '4-4-2', managerName: 'John Doolan', realPlayers: [] },
    { name: 'Barrow', shortName: 'Barrow', abbreviation: 'BRW', stadium: 'Holker Street', reputation: 22, finances: 18, primaryColor: '#004B8D', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Andy Whing', realPlayers: [] },
    { name: 'Bromley', shortName: 'Bromley', abbreviation: 'BRO', stadium: 'Hayes Lane', reputation: 20, finances: 16, primaryColor: '#000000', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Andy Woodman', realPlayers: [] },
    { name: 'Carlisle United', shortName: 'Carlisle', abbreviation: 'CRL', stadium: 'Brunton Park', reputation: 24, finances: 20, primaryColor: '#0033A0', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '5-3-2', managerName: 'Paul Simpson', realPlayers: [] },
    { name: 'Cheltenham Town', shortName: 'Cheltenham', abbreviation: 'CHL', stadium: 'Whaddon Road', reputation: 22, finances: 18, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'Michael Flynn', realPlayers: [] },
    { name: 'Colchester United', shortName: 'Colchester', abbreviation: 'COL', stadium: 'JobServe Community Stadium', reputation: 22, finances: 18, primaryColor: '#004B8D', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Danny Cowley', realPlayers: [] },
    { name: 'Crewe Alexandra', shortName: 'Crewe', abbreviation: 'CRE', stadium: 'Gresty Road', reputation: 20, finances: 16, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'Lee Bell', realPlayers: [] },
    { name: 'Doncaster Rovers', shortName: 'Doncaster', abbreviation: 'DON', stadium: 'Eco-Power Stadium', reputation: 26, finances: 22, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Grant McCann', realPlayers: [] },
    { name: 'Gillingham', shortName: 'Gillingham', abbreviation: 'GIL', stadium: 'Priestfield Stadium', reputation: 24, finances: 20, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Mark Bonner', realPlayers: [] },
    { name: 'Harrogate Town', shortName: 'Harrogate', abbreviation: 'HAR', stadium: 'Wetherby Road', reputation: 20, finances: 16, primaryColor: '#F5D313', secondaryColor: '#000000', tactic: 'LowBlock', formation: '4-4-2', managerName: 'Simon Weaver', realPlayers: [] },
    { name: 'Milton Keynes Dons', shortName: 'MK Dons', abbreviation: 'MKD', stadium: 'Stadium MK', reputation: 26, finances: 22, primaryColor: '#FFFFFF', secondaryColor: '#000000', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Scott Lindsey', realPlayers: [] },
    { name: 'Morecambe', shortName: 'Morecambe', abbreviation: 'MOR', stadium: 'Mazuma Stadium', reputation: 20, finances: 16, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Derek Adams', realPlayers: [] },
    { name: 'Newport County', shortName: 'Newport', abbreviation: 'NEW', stadium: 'Rodney Parade', reputation: 22, finances: 18, primaryColor: '#F5A12D', secondaryColor: '#000000', tactic: 'Direct', formation: '4-4-2', managerName: 'Nelson Jardim', realPlayers: [] },
    { name: 'Notts County', shortName: 'Notts County', abbreviation: 'NCO', stadium: 'Meadow Lane', reputation: 26, finances: 22, primaryColor: '#000000', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Stuart Maynard', realPlayers: [] },
    { name: 'Salford City', shortName: 'Salford', abbreviation: 'SAL', stadium: 'Peninsula Stadium', reputation: 24, finances: 20, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'Karl Robinson', realPlayers: [] },
    { name: 'Shrewsbury Town', shortName: 'Shrewsbury', abbreviation: 'SHR', stadium: 'New Meadow', reputation: 24, finances: 20, primaryColor: '#0057B8', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '4-4-2', managerName: 'Michael Appleton', realPlayers: [] },
    { name: 'Swindon Town', shortName: 'Swindon', abbreviation: 'SWI', stadium: 'County Ground', reputation: 26, finances: 22, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Ian Holloway', realPlayers: [] },
    { name: 'Tranmere Rovers', shortName: 'Tranmere', abbreviation: 'TRA', stadium: 'Prenton Park', reputation: 24, finances: 20, primaryColor: '#FFFFFF', secondaryColor: '#1D3C6E', tactic: 'Direct', formation: '4-4-2', managerName: 'Andy Crosby', realPlayers: [] },
    { name: 'Walsall', shortName: 'Walsall', abbreviation: 'WAL', stadium: 'Bescot Stadium', reputation: 22, finances: 18, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'Mat Sadler', realPlayers: [] },
    { name: 'Forest Green Rovers', shortName: 'Forest Green', abbreviation: 'FGR', stadium: 'The New Lawn', reputation: 22, finances: 18, primaryColor: '#00A651', secondaryColor: '#000000', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Robbie Savage', realPlayers: [] },
    { name: 'Sutton United', shortName: 'Sutton', abbreviation: 'SUT', stadium: 'Gander Green Lane', reputation: 20, finances: 16, primaryColor: '#F5D313', secondaryColor: '#000000', tactic: 'Direct', formation: '4-4-2', managerName: 'Steve Morison', realPlayers: [] },
    { name: 'Grimsby Town Reserves', shortName: 'Grimsby Res', abbreviation: 'GRR', stadium: 'Blundell Park', reputation: 18, finances: 14, primaryColor: '#000000', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'David Artell', realPlayers: [] },
  ],
};

const ALL_LEAGUES: LeagueSeed[] = [PREMIER_LEAGUE, CHAMPIONSHIP, LEAGUE_ONE, LEAGUE_TWO];

// ------------------------------------------------------------
// PLAYER NAME POOLS (used when real names run out)
// ------------------------------------------------------------

const FIRST_NAMES = [
  'Alex', 'Ben', 'Carl', 'Daniel', 'Elliot', 'Felix', 'Gabriel', 'Harry', 'Isaac', 'Jack',
  'Kai', 'Liam', 'Mason', 'Noah', 'Oscar', 'Paul', 'Quinn', 'Rhys', 'Sam', 'Theo',
  'Umar', 'Victor', 'Will', 'Xavier', 'Yusuf', 'Zach', 'Adrian', 'Bruno', 'Cole', 'Dario',
  'Ethan', 'Finn', 'George', 'Hugo', 'Ian', 'Jonah', 'Kieron', 'Leo', 'Marcus', 'Nico',
  'Oliver', 'Peter', 'Rory', 'Sebastian', 'Toby', 'Valentin', 'Wesley', 'Yannick', 'Zane',
];

const SURNAMES = [
  'Adams', 'Baker', 'Clarke', 'Davies', 'Evans', 'Foster', 'Grant', 'Hill', 'Irving',
  'Jones', 'Kerr', 'Lewis', 'Moore', 'Nash', 'Owen', 'Parker', 'Quinn', 'Reed', 'Smith',
  'Taylor', 'Underwood', 'Vaughn', 'Walker', 'Young', 'Zimmerman', 'Ashworth', 'Beckett',
  'Carter', 'Doyle', 'Ellison', 'Fletcher', 'Grayson', 'Hughes', 'Ingram', 'Jarvis',
  'Kingsley', 'Lawson', 'Mitchell', 'Newman', 'Ortiz', 'Pierce', 'Reeves', 'Sinclair',
  'Todd', 'Ulrich', 'Vickers', 'Whitmore', 'Yates', 'Zola',
];

// ------------------------------------------------------------
// SQUAD COMPOSITION TARGET
// ------------------------------------------------------------

const SQUAD_COMPOSITION: { pos: Position; count: number }[] = [
  { pos: 'GK', count: 2 },
  { pos: 'RB', count: 2 },
  { pos: 'LB', count: 2 },
  { pos: 'CB', count: 3 },
  { pos: 'DM', count: 2 },
  { pos: 'CM', count: 2 },
  { pos: 'AM', count: 1 },
  { pos: 'RW', count: 1 },
  { pos: 'LW', count: 1 },
  { pos: 'ST', count: 2 },
];

// ------------------------------------------------------------
// WORLD GENERATION
// ------------------------------------------------------------

export interface WorldData {
  clubs: Club[];
  leagues: League[];
  players: Player[];
  standings: Record<string, StandingRow[]>;
}

export function generateWorld(rng: RNG, startingDate: string): WorldData {
  const clubs: Club[] = [];
  const players: Player[] = [];
  const leagues: League[] = [];

  for (const leagueSeed of ALL_LEAGUES) {
    const leagueClubIds: string[] = [];

    for (const seed of leagueSeed.clubs) {
      const clubId = `club_${slugify(seed.name)}_${leagueSeed.id}`;
      const club: Club = {
        id: clubId,
        name: seed.name,
        shortName: seed.shortName,
        abbreviation: seed.abbreviation,
        country: 'England',
        stadium: seed.stadium,
        reputation: seed.reputation,
        finances: seed.finances,
        trainingFacilities: Math.round(seed.reputation * 0.9),
        youthFacilities: Math.round(seed.reputation * 0.85),
        primaryColor: seed.primaryColor,
        secondaryColor: seed.secondaryColor,
        formation: seed.formation,
        tactic: seed.tactic,
        managerName: seed.managerName,
        leagueId: leagueSeed.id,
      };
      clubs.push(club);
      leagueClubIds.push(clubId);

      // Generate squad for this club
      generateSquadForClub(club, seed.realPlayers, rng, startingDate, players);
    }

    leagues.push({
      id: leagueSeed.id,
      name: leagueSeed.name,
      country: 'England',
      tier: leagueSeed.tier,
      clubIds: leagueClubIds,
      season: seasonFromDate(startingDate),
    });
  }

  // Initialise empty standings for every league
  const standings: Record<string, StandingRow[]> = {};
  for (const league of leagues) {
    standings[league.id] = league.clubIds.map((clubId) => ({
      clubId,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      points: 0, form: [],
    }));
  }

  return { clubs, leagues, players, standings };
}

// ------------------------------------------------------------
// SQUAD GENERATION
// ------------------------------------------------------------

function generateSquadForClub(
  club: Club,
  realPlayers: RealPlayerSeed[],
  rng: RNG,
  startingDate: string,
  out: Player[],
): void {
  const baseRating = 46 + (club.reputation / 100) * 32;
  const usedShirt = new Set<number>();
  const assignedReal = new Set<string>();

  // Sort real players by expected starter importance (GK, DEF, MID, ATT)
  const sortedReal = [...realPlayers].sort(
    (a, b) => positionPriority(a.pos) - positionPriority(b.pos),
  );

  let nextShirt = 1;
  const takeShirt = (): number => {
    while (usedShirt.has(nextShirt)) nextShirt++;
    usedShirt.add(nextShirt);
    return nextShirt++;
  };

  for (const { pos, count } of SQUAD_COMPOSITION) {
    for (let i = 0; i < count; i++) {
      // Try to place a real player first in this position slot
      const realIdx = sortedReal.findIndex(
        (r) => r.pos === pos && !assignedReal.has(r.name),
      );

      const isStarter = i === 0;
      const offset = isStarter ? 0 : rng.float(-9, -4);
      const targetOverall = clampAttribute(baseRating + offset);
      const age = rng.int(19, 34);
      const isYouth = age <= 20;
      const personality = rng.pick([
        'Ambitious', 'Loyal', 'Professional', 'Competitive',
        'Reserved', 'Charismatic', 'RiskTaker',
      ] as const);

      const attributes = generateAttributes(rng, targetOverall, pos, personality, isYouth);
      const overall = computeOverall(attributes, pos);
      const potential = generatePotential(rng, overall, age, club.youthFacilities);

      let name: string;
      let playerId: string;
      if (realIdx >= 0) {
        const real = sortedReal[realIdx];
        name = real.name;
        assignedReal.add(real.name);
        playerId = `player_${slugify(real.name)}_${club.id}`;
      } else {
        const first = rng.pick(FIRST_NAMES);
        const last = rng.pick(SURNAMES);
        name = `${first} ${last}`;
        playerId = `player_gen_${club.id}_${pos}_${i}`;
      }

      const wage = computeWage(overall, age, club.finances);
      const endYear = new Date(startingDate).getUTCFullYear() + 1 + rng.int(0, 2);
      const contract: PlayerContract = {
        clubId: club.id,
        weeklyWage: wage,
        startDate: startingDate,
        endDate: `${endYear}-06-30`,
        squadRole: isStarter ? 'Starter' : 'Rotation',
        signingBonus: 0,
        appearanceBonus: 0,
        goalBonus: 0,
        releaseClause: null,
      };

      const [firstName, ...rest] = name.split(' ');
      const surname = rest.join(' ') || firstName;

      out.push({
        id: playerId,
        firstName,
        surname,
        displayName: name,
        nationality: rng.pick([
          'England', 'France', 'Germany', 'Spain', 'Italy',
          'Portugal', 'Netherlands', 'Brazil', 'Argentina', 'Belgium',
        ] as const) as Nationality,
        dateOfBirth: birthDateForAge(age, startingDate, rng),
        age,
        foot: rng.weighted(['Right', 'Left', 'Both'] as const, [0.75, 0.22, 0.03]),
        heightCm: rng.int(168, 195),
        weightKg: rng.int(65, 92),
        primaryPosition: pos,
        secondaryPosition: rng.chance(0.3) ? rng.pick(adjacentPositions(pos)) : null,
        shirtNumber: takeShirt(),
        personality,
        attributes,
        potential,
        overall,
        fitness: 90 + rng.int(0, 10),
        fatigue: 5,
        sharpness: 70,
        morale: 70 + rng.int(0, 20),
        confidence: 60 + rng.int(0, 30),
        injury: null,
        clubId: club.id,
        contract,
        status: isStarter ? 'Starter' : 'Rotation',
        form: 0,
        seasonStats: [],
        careerAppearances: rng.int(0, 60),
        careerGoals: 0,
        careerAssists: 0,
        developmentPoints: 0,
        trainingFocus: null,
      });
    }
  }
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function positionPriority(pos: Position): number {
  switch (pos) {
    case 'GK': return 0;
    case 'CB': case 'RB': case 'LB': return 1;
    case 'DM': case 'CM': case 'AM': return 2;
    case 'RW': case 'LW': case 'ST': return 3;
  }
}

function computeWage(overall: number, age: number, clubFinances: number): number {
  const base = Math.pow(Math.max(1, overall - 40), 2.3) * 11;
  const ageMult = age < 21 ? 0.55 : age < 24 ? 0.8 : age < 29 ? 1.0 : age < 33 ? 0.95 : 0.7;
  const financeMult = 0.6 + (clubFinances / 100) * 1.0;
  return Math.max(400, Math.round((base * ageMult * financeMult) / 100) * 100);
}

function adjacentPositions(pos: Position): Position[] {
  switch (pos) {
    case 'GK': return ['GK'];
    case 'RB': return ['LB', 'CB', 'RW', 'DM'];
    case 'LB': return ['RB', 'CB', 'LW', 'DM'];
    case 'CB': return ['RB', 'LB', 'DM'];
    case 'DM': return ['CM', 'CB', 'RB', 'LB'];
    case 'CM': return ['DM', 'AM', 'RW', 'LW'];
    case 'AM': return ['CM', 'RW', 'LW', 'ST'];
    case 'RW': return ['LW', 'AM', 'ST', 'RB'];
    case 'LW': return ['RW', 'AM', 'ST', 'LB'];
    case 'ST': return ['AM', 'RW', 'LW'];
  }
}

function birthDateForAge(age: number, refDate: string, rng: RNG): string {
  const [y] = refDate.split('-').map(Number);
  const birthYear = y - age;
  const month = String(1 + rng.int(0, 11)).padStart(2, '0');
  const day = String(1 + rng.int(0, 27)).padStart(2, '0');
  return `${birthYear}-${month}-${day}`;
}

function seasonFromDate(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  if (m >= 7) return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}/${String(y % 100).padStart(2, '0')}`;
}

// ------------------------------------------------------------
// LOOKUP HELPERS
// ------------------------------------------------------------

export function getClubById(clubs: Club[], id: string): Club {
  const c = clubs.find((x) => x.id === id);
  if (!c) throw new Error(`Club not found: ${id}`);
  return c;
}

export function getPlayerById(players: Player[], id: string): Player {
  const p = players.find((x) => x.id === id);
  if (!p) throw new Error(`Player not found: ${id}`);
  return p;
}

export function getSquad(players: Player[], clubId: string): Player[] {
  return players.filter((p) => p.clubId === clubId);
}

/** Sort squad: GK → DEF → MID → ATT, then by overall desc */
export function sortSquad(players: Player[]): Player[] {
  const order: Record<Position, number> = {
    GK: 0, RB: 1, LB: 1, CB: 1, DM: 2, CM: 2, AM: 2, RW: 3, LW: 3, ST: 3,
  };
  return [...players].sort((a, b) => {
    const oa = order[a.primaryPosition];
    const ob = order[b.primaryPosition];
    if (oa !== ob) return oa - ob;
    return b.overall - a.overall;
  });
}
