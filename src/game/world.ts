// ============================================================
// ENGLISH FOOTBALL WORLD — 2026/27
// Premier League clubs verified against premierleague.com
// Lower leagues use real club names; player data: real anchors
// where confirmed, generated players fill the rest.
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

interface RealPlayerSeed {
  name: string;
  pos: Position;
}

interface ClubSeed {
  name: string;
  shortName: string;
  abbreviation: string;
  stadium: string;
  reputation: number;
  finances: number;
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
// PREMIER LEAGUE 2026/27 — 20 confirmed clubs
// Player anchors from premierleague.com squad pages where
// search results contained confirmed names.
// ------------------------------------------------------------

const PREMIER_LEAGUE: LeagueSeed = {
  id: 'league_epl',
  name: 'Premier League',
  tier: 1,
  clubs: [
    {
      name: 'Arsenal', shortName: 'Arsenal', abbreviation: 'ARS',
      stadium: 'Emirates Stadium', reputation: 92, finances: 88,
      primaryColor: '#EF0107', secondaryColor: '#FFFFFF',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Mikel Arteta',
      realPlayers: [
        { name: 'David Raya', pos: 'GK' },
        { name: 'William Saliba', pos: 'CB' },
        { name: 'Gabriel Magalhães', pos: 'CB' },
        { name: 'Declan Rice', pos: 'CM' },
        { name: 'Martin Ødegaard', pos: 'AM' },
        { name: 'Bukayo Saka', pos: 'RW' },
        { name: 'Kai Havertz', pos: 'ST' },
        { name: 'Viktor Gyökeres', pos: 'ST' },
        { name: 'Eberechi Eze', pos: 'AM' },
      ],
    },
    {
      name: 'Aston Villa', shortName: 'Aston Villa', abbreviation: 'AVL',
      stadium: 'Villa Park', reputation: 80, finances: 76,
      primaryColor: '#95BFE5', secondaryColor: '#670E36',
      tactic: 'Counter', formation: '4-2-3-1', managerName: 'Unai Emery',
      realPlayers: [
        { name: 'Emiliano Buendía', pos: 'AM' },
        { name: 'John McGinn', pos: 'CM' },
        { name: 'Tyrone Mings', pos: 'CB' },
        { name: 'Leon Goretzka', pos: 'CM' },
        { name: 'Aaron Wan-Bissaka', pos: 'RB' },
        { name: 'Nicolas Jackson', pos: 'ST' },
        { name: 'Alejandro Garnacho', pos: 'LW' },
      ],
    },
    {
      name: 'AFC Bournemouth', shortName: 'Bournemouth', abbreviation: 'BOU',
      stadium: 'Vitality Stadium', reputation: 70, finances: 64,
      primaryColor: '#DA291C', secondaryColor: '#000000',
      tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Andoni Iraola',
      realPlayers: [
        { name: 'Đorđe Petrović', pos: 'GK' },
        { name: 'Lewis Cook', pos: 'CM' },
        { name: 'Justin Kluivert', pos: 'AM' },
        { name: 'Evanilson', pos: 'ST' },
        { name: 'David Brooks', pos: 'RW' },
        { name: 'Tyler Adams', pos: 'DM' },
        { name: 'Antoine Semenyo', pos: 'LW' },
      ],
    },
    {
      name: 'Brentford', shortName: 'Brentford', abbreviation: 'BRE',
      stadium: 'Gtech Community Stadium', reputation: 70, finances: 64,
      primaryColor: '#E30613', secondaryColor: '#FFFFFF',
      tactic: 'Direct', formation: '4-3-3', managerName: 'Keith Andrews',
      realPlayers: [
        { name: 'Caoimhín Kelleher', pos: 'GK' },
        { name: 'Nathan Collins', pos: 'CB' },
        { name: 'Mathias Jensen', pos: 'CM' },
        { name: 'Kevin Schade', pos: 'LW' },
        { name: 'Igor Thiago', pos: 'ST' },
        { name: 'Mikkel Damsgaard', pos: 'AM' },
      ],
    },
    {
      name: 'Brighton & Hove Albion', shortName: 'Brighton', abbreviation: 'BHA',
      stadium: 'American Express Stadium', reputation: 80, finances: 72,
      primaryColor: '#0057B8', secondaryColor: '#FFFFFF',
      tactic: 'Possession', formation: '4-2-3-1', managerName: 'Fabian Hürzeler',
      realPlayers: [
        { name: 'Bart Verbruggen', pos: 'GK' },
        { name: 'Lewis Dunk', pos: 'CB' },
        { name: 'Pascal Gross', pos: 'CM' },
        { name: 'Kaoru Mitoma', pos: 'LW' },
        { name: 'Georginio Rutter', pos: 'AM' },
        { name: 'Yankuba Minteh', pos: 'RW' },
        { name: 'Evan Ferguson', pos: 'ST' },
      ],
    },
    {
      name: 'Chelsea', shortName: 'Chelsea', abbreviation: 'CHE',
      stadium: 'Stamford Bridge', reputation: 88, finances: 90,
      primaryColor: '#034694', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Enzo Maresca',
      realPlayers: [
        { name: 'Emiliano Martínez', pos: 'GK' },
        { name: 'Reece James', pos: 'RB' },
        { name: 'Levi Colwill', pos: 'CB' },
        { name: 'Moisés Caicedo', pos: 'DM' },
        { name: 'Cole Palmer', pos: 'AM' },
        { name: 'Pedro Neto', pos: 'RW' },
        { name: 'João Pedro', pos: 'ST' },
        { name: 'Romeo Lavia', pos: 'CM' },
        { name: 'Morgan Rogers', pos: 'AM' },
      ],
    },
    {
      name: 'Coventry City', shortName: 'Coventry', abbreviation: 'COV',
      stadium: 'Coventry Building Society Arena', reputation: 62, finances: 56,
      primaryColor: '#78D0F3', secondaryColor: '#000000',
      tactic: 'Balanced', formation: '4-4-2', managerName: 'Frank Lampard',
      realPlayers: [
        { name: 'Ethan Pinnock', pos: 'CB' },
      ],
    },
    {
      name: 'Crystal Palace', shortName: 'Crystal Palace', abbreviation: 'CRY',
      stadium: 'Selhurst Park', reputation: 72, finances: 66,
      primaryColor: '#1B458F', secondaryColor: '#C4122E',
      tactic: 'Counter', formation: '3-4-2-1', managerName: 'Oliver Glasner',
      realPlayers: [
        { name: 'Dean Henderson', pos: 'GK' },
        { name: 'Marc Guéhi', pos: 'CB' },
        { name: 'Eberechi Eze', pos: 'AM' },
      ],
    },
    {
      name: 'Everton', shortName: 'Everton', abbreviation: 'EVE',
      stadium: 'Hill Dickinson Stadium', reputation: 74, finances: 68,
      primaryColor: '#003399', secondaryColor: '#FFFFFF',
      tactic: 'LowBlock', formation: '4-4-2', managerName: 'David Moyes',
      realPlayers: [
        { name: 'Jordan Pickford', pos: 'GK' },
        { name: 'Jarrad Branthwaite', pos: 'CB' },
        { name: 'Iliman Ndiaye', pos: 'AM' },
      ],
    },
    {
      name: 'Fulham', shortName: 'Fulham', abbreviation: 'FUL',
      stadium: 'Craven Cottage', reputation: 72, finances: 70,
      primaryColor: '#FFFFFF', secondaryColor: '#000000',
      tactic: 'Possession', formation: '4-2-3-1', managerName: 'Marco Silva',
      realPlayers: [
        { name: 'Bernd Leno', pos: 'GK' },
        { name: 'Antonee Robinson', pos: 'LB' },
        { name: 'Calvin Bassey', pos: 'CB' },
        { name: 'Sander Berge', pos: 'CM' },
        { name: 'Emile Smith Rowe', pos: 'AM' },
        { name: 'Alex Iwobi', pos: 'RW' },
        { name: 'Rodrigo Muniz', pos: 'ST' },
      ],
    },
    {
      name: 'Hull City', shortName: 'Hull', abbreviation: 'HUL',
      stadium: 'KCOM Stadium', reputation: 62, finances: 56,
      primaryColor: '#F5A12D', secondaryColor: '#000000',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Sergej Jakirović',
      realPlayers: [
        { name: 'Jack Butland', pos: 'GK' },
        { name: 'Mohamed Belloumi', pos: 'RW' },
        { name: 'Regan Slater', pos: 'CM' },
        { name: 'Ollie McBurnie', pos: 'ST' },
        { name: 'Matt Crooks', pos: 'CM' },
        { name: 'Hidemasa Morita', pos: 'DM' },
        { name: 'Joe Gelhardt', pos: 'ST' },
      ],
    },
    {
      name: 'Ipswich Town', shortName: 'Ipswich', abbreviation: 'IPS',
      stadium: 'Portman Road', reputation: 62, finances: 56,
      primaryColor: '#0044A9', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Kieran McKenna',
      realPlayers: [],
    },
    {
      name: 'Leeds United', shortName: 'Leeds', abbreviation: 'LEE',
      stadium: 'Elland Road', reputation: 68, finances: 60,
      primaryColor: '#FFFFFF', secondaryColor: '#1D428A',
      tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Daniel Farke',
      realPlayers: [
        { name: 'Ethan Ampadu', pos: 'DM' },
        { name: 'Brenden Aaronson', pos: 'AM' },
      ],
    },
    {
      name: 'Liverpool', shortName: 'Liverpool', abbreviation: 'LIV',
      stadium: 'Anfield', reputation: 91, finances: 88,
      primaryColor: '#C8102E', secondaryColor: '#F6EB61',
      tactic: 'HighPress', formation: '4-3-3', managerName: 'Arne Slot',
      realPlayers: [
        { name: 'Alisson', pos: 'GK' },
        { name: 'Virgil van Dijk', pos: 'CB' },
        { name: 'Mohamed Salah', pos: 'RW' },
        { name: 'Alexis Mac Allister', pos: 'CM' },
        { name: 'Ryan Gravenberch', pos: 'DM' },
        { name: 'Florian Wirtz', pos: 'AM' },
      ],
    },
    {
      name: 'Manchester City', shortName: 'Man City', abbreviation: 'MCI',
      stadium: 'Etihad Stadium', reputation: 95, finances: 95,
      primaryColor: '#6CABDD', secondaryColor: '#1C2C5B',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Pep Guardiola',
      realPlayers: [
        { name: 'Erling Haaland', pos: 'ST' },
        { name: 'Rodri', pos: 'DM' },
        { name: 'Phil Foden', pos: 'AM' },
        { name: 'Rúben Dias', pos: 'CB' },
      ],
    },
    {
      name: 'Manchester United', shortName: 'Man Utd', abbreviation: 'MUN',
      stadium: 'Old Trafford', reputation: 87, finances: 85,
      primaryColor: '#DA291C', secondaryColor: '#FBE122',
      tactic: 'Direct', formation: '3-4-2-1', managerName: 'Rúben Amorim',
      realPlayers: [
        { name: 'Bruno Fernandes', pos: 'AM' },
        { name: 'Kobbie Mainoo', pos: 'CM' },
        { name: 'Matthijs de Ligt', pos: 'CB' },
      ],
    },
    {
      name: 'Newcastle United', shortName: 'Newcastle', abbreviation: 'NEW',
      stadium: "St James' Park", reputation: 81, finances: 78,
      primaryColor: '#241F20', secondaryColor: '#FFFFFF',
      tactic: 'HighPress', formation: '4-3-3', managerName: 'Eddie Howe',
      realPlayers: [
        { name: 'Alexander Isak', pos: 'ST' },
        { name: 'Bruno Guimarães', pos: 'CM' },
        { name: 'Sandro Tonali', pos: 'DM' },
        { name: 'Anthony Gordon', pos: 'LW' },
      ],
    },
    {
      name: 'Nottingham Forest', shortName: 'Nottm Forest', abbreviation: 'NFO',
      stadium: 'City Ground', reputation: 72, finances: 68,
      primaryColor: '#DD0000', secondaryColor: '#FFFFFF',
      tactic: 'Counter', formation: '4-2-3-1', managerName: 'Nuno Espírito Santo',
      realPlayers: [
        { name: 'Morgan Gibbs-White', pos: 'AM' },
        { name: 'Murillo', pos: 'CB' },
        { name: 'Chris Wood', pos: 'ST' },
      ],
    },
    {
      name: 'Sunderland', shortName: 'Sunderland', abbreviation: 'SUN',
      stadium: 'Stadium of Light', reputation: 65, finances: 58,
      primaryColor: '#EB172B', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-3-3', managerName: 'Régis Le Bris',
      realPlayers: [
        { name: 'Jobe Bellingham', pos: 'CM' },
        { name: 'Dan Neil', pos: 'CM' },
      ],
    },
    {
      name: 'Tottenham Hotspur', shortName: 'Spurs', abbreviation: 'TOT',
      stadium: 'Tottenham Hotspur Stadium', reputation: 84, finances: 82,
      primaryColor: '#132257', secondaryColor: '#FFFFFF',
      tactic: 'HighPress', formation: '4-3-3', managerName: 'Thomas Frank',
      realPlayers: [
        { name: 'James Maddison', pos: 'AM' },
        { name: 'Cristian Romero', pos: 'CB' },
        { name: 'Dominic Solanke', pos: 'ST' },
      ],
    },
  ],
};

// ------------------------------------------------------------
// CHAMPIONSHIP / LEAGUE ONE / LEAGUE TWO
// Real club names. Player anchors minimal — search coverage is
// thin for these divisions. Generated players fill squads.
// ------------------------------------------------------------

const CHAMPIONSHIP: LeagueSeed = {
  id: 'league_champ',
  name: 'EFL Championship',
  tier: 2,
  clubs: [
    { name: 'Sheffield United', shortName: 'Sheff Utd', abbreviation: 'SHU', stadium: 'Bramall Lane', reputation: 58, finances: 52, primaryColor: '#EE2737', secondaryColor: '#000000', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Chris Wilder', realPlayers: [
      { name: 'Tyrese Campbell', pos: 'ST' },
      { name: 'Callum O\'Hare', pos: 'AM' },
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
  ],
};

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
    { name: 'Wigan Athletic', shortName: 'Wigan', abbreviation: 'WIG', stadium: 'DW Stadium', reputation: 32, finances: 26, primaryColor: '#0033A0', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Shaun Maloney', realPlayers: [] },
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
    { name: 'Blackpool', shortName: 'Blackpool', abbreviation: 'BLA', stadium: 'Bloomfield Road', reputation: 36, finances: 30, primaryColor: '#F68712', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Steve Bruce', realPlayers: [] },
    { name: 'Bolton Wanderers', shortName: 'Bolton', abbreviation: 'BOL', stadium: 'Toughsheet Community Stadium', reputation: 34, finances: 28, primaryColor: '#FFFFFF', secondaryColor: '#1D3C6E
