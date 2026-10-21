// ============================================================
// REAL ENGLISH FOOTBALL WORLD (2026/27)
// Clubs: real names (Premier League through League Two)
// Players: real names where confirmed, generated players fill the rest
// ============================================================

import type {
  Club, League, Player, PlayerContract, Position,
  StandingRow, TacticStyle, Nationality,
} from './types';
import { RNG, clampAttribute } from './rng';
import { generateAttributes, generatePotential } from './attributes';
import { computeOverall } from './positions';

// ------------------------------------------------------------
// LEAGUE DEFINITIONS
// ------------------------------------------------------------

interface ClubSeed {
  name: string;
  shortName: string;
  abbreviation: string;
  stadium: string;
  reputation: number;   // 1-100 (drives squad quality)
  finances: number;
  primaryColor: string;
  secondaryColor: string;
  tactic: TacticStyle;
  formation: string;
  managerName: string;
  /** Real player names confirmed from 2026/27 sources. May be partial. */
  realPlayers?: { name: string; pos: Position }[];
}

interface LeagueSeed {
  id: string;
  name: string;
  tier: number;
  clubs: ClubSeed[];
}

// Premier League 2026/27 clubs (per standings/cup sources)
// Reputation roughly reflects stature; adjust as desired.
const PREMIER_LEAGUE: LeagueSeed = {
  id: 'league_epl',
  name: 'Premier League',
  tier: 1,
  clubs: [
    {
      name: 'Manchester City', shortName: 'Man City', abbreviation: 'MCI',
      stadium: 'Etihad Stadium', reputation: 95, finances: 95,
      primaryColor: '#6CABDD', secondaryColor: '#1C2C5B',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Pep Guardiola',
      realPlayers: [
        { name: 'Erling Haaland', pos: 'ST' },
        { name: 'Rodri', pos: 'DM' },
        { name: 'Phil Foden', pos: 'AM' },
      ],
    },
    {
      name: 'Arsenal', shortName: 'Arsenal', abbreviation: 'ARS',
      stadium: 'Emirates Stadium', reputation: 92, finances: 88,
      primaryColor: '#EF0107', secondaryColor: '#FFFFFF',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Mikel Arteta',
      realPlayers: [
        { name: 'Bukayo Saka', pos: 'RW' },
        { name: 'Declan Rice', pos: 'CM' },
        { name: 'Martin Ødegaard', pos: 'AM' },
        { name: 'William Saliba', pos: 'CB' },
        { name: 'David Raya', pos: 'GK' },
      ],
    },
    {
      name: 'Liverpool', shortName: 'Liverpool', abbreviation: 'LIV',
      stadium: 'Anfield', reputation: 91, finances: 88,
      primaryColor: '#C8102E', secondaryColor: '#F6EB61',
      tactic: 'HighPress', formation: '4-3-3', managerName: 'Arne Slot',
      realPlayers: [
        { name: 'Mohamed Salah', pos: 'RW' },
        { name: 'Virgil van Dijk', pos: 'CB' },
        { name: 'Alisson', pos: 'GK' },
      ],
    },
    {
      name: 'Chelsea', shortName: 'Chelsea', abbreviation: 'CHE',
      stadium: 'Stamford Bridge', reputation: 88, finances: 90,
      primaryColor: '#034694', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Enzo Maresca',
      realPlayers: [
        { name: 'Cole Palmer', pos: 'AM' },
        { name: 'Moisés Caicedo', pos: 'DM' },
        { name: 'Reece James', pos: 'RB' },
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
      ],
    },
    {
      name: 'Aston Villa', shortName: 'Aston Villa', abbreviation: 'AVL',
      stadium: 'Villa Park', reputation: 80, finances: 76,
      primaryColor: '#95BFE5', secondaryColor: '#670E36',
      tactic: 'Counter', formation: '4-2-3-1', managerName: 'Unai Emery',
      realPlayers: [
        { name: 'Ollie Watkins', pos: 'ST' },
        { name: 'Youri Tielemans', pos: 'CM' },
      ],
    },
    {
      name: 'Brighton & Hove Albion', shortName: 'Brighton', abbreviation: 'BHA',
      stadium: 'Amex Stadium', reputation: 78, finances: 72,
      primaryColor: '#0057B8', secondaryColor: '#FFFFFF',
      tactic: 'Possession', formation: '4-2-3-1', managerName: 'Fabian Hürzeler',
      realPlayers: [
        { name: 'Kaoru Mitoma', pos: 'LW' },
        { name: 'Bart Verbruggen', pos: 'GK' },
      ],
    },
    {
      name: 'West Ham United', shortName: 'West Ham', abbreviation: 'WHU',
      stadium: 'London Stadium', reputation: 75, finances: 72,
      primaryColor: '#7A263A', secondaryColor: '#1BB1E7',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Graham Potter',
      realPlayers: [
        { name: 'Jarrod Bowen', pos: 'RW' },
        { name: 'Lucas Paquetá', pos: 'AM' },
      ],
    },
    {
      name: 'Everton', shortName: 'Everton', abbreviation: 'EVE',
      stadium: 'Hill Dickinson Stadium', reputation: 74, finances: 68,
      primaryColor: '#003399', secondaryColor: '#FFFFFF',
      tactic: 'LowBlock', formation: '4-4-2', managerName: 'David Moyes',
      realPlayers: [
        { name: 'Jordan Pickford', pos: 'GK' },
        { name: 'Iliman Ndiaye', pos: 'AM' },
      ],
    },
    {
      name: 'Fulham', shortName: 'Fulham', abbreviation: 'FUL',
      stadium: 'Craven Cottage', reputation: 72, finances: 70,
      primaryColor: '#FFFFFF', secondaryColor: '#000000',
      tactic: 'Possession', formation: '4-2-3-1', managerName: 'Marco Silva',
      realPlayers: [
        { name: 'Antonee Robinson', pos: 'LB' },
        { name: 'Emile Smith Rowe', pos: 'AM' },
      ],
    },
    {
      name: 'Crystal Palace', shortName: 'Crystal Palace', abbreviation: 'CRY',
      stadium: 'Selhurst Park', reputation: 72, finances: 66,
      primaryColor: '#1B458F', secondaryColor: '#C4122E',
      tactic: 'Counter', formation: '3-4-2-1', managerName: 'Oliver Glasner',
      realPlayers: [
        { name: 'Eberechi Eze', pos: 'AM' },
        { name: 'Marc Guéhi', pos: 'CB' },
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
      ],
    },
    {
      name: 'AFC Bournemouth', shortName: 'Bournemouth', abbreviation: 'BOU',
      stadium: 'Vitality Stadium', reputation: 68, finances: 62,
      primaryColor: '#DA291C', secondaryColor: '#000000',
      tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Andoni Iraola',
      realPlayers: [
        { name: 'Justin Kluivert', pos: 'AM' },
        { name: 'Evanilson', pos: 'ST' },
      ],
    },
    {
      name: 'Wolverhampton Wanderers', shortName: 'Wolves', abbreviation: 'WOL',
      stadium: 'Molineux', reputation: 68, finances: 62,
      primaryColor: '#FDB913', secondaryColor: '#231F20',
      tactic: 'Counter', formation: '3-4-2-1', managerName: 'Vítor Pereira',
      realPlayers: [
        { name: 'João Gomes', pos: 'DM' },
        { name: 'André', pos: 'DM' },
      ],
    },
    {
      name: 'Leeds United', shortName: 'Leeds', abbreviation: 'LEE',
      stadium: 'Elland Road', reputation: 67, finances: 60,
      primaryColor: '#FFFFFF', secondaryColor: '#1D428A',
      tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Daniel Farke',
      realPlayers: [
        { name: 'Ethan Ampadu', pos: 'DM' },
        { name: 'Brenden Aaronson', pos: 'AM' },
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
      name: 'Hull City', shortName: 'Hull', abbreviation: 'HUL',
      stadium: 'MKM Stadium', reputation: 62, finances: 56,
      primaryColor: '#F5A12D', secondaryColor: '#000000',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Sergej Jakirović',
      realPlayers: [
        { name: 'Mohamed Belloumi', pos: 'RW' },
        { name: 'Regan Slater', pos: 'CM' },
      ],
    },
  ],
};

// ------------------------------------------------------------
// CHAMPIONSHIP (real club anchors, partial player data)
// ------------------------------------------------------------

const CHAMPIONSHIP: LeagueSeed = {
  id: 'league_champ',
  name: 'EFL Championship',
  tier: 2,
  clubs: [
    {
      name: 'Sheffield United', shortName: 'Sheff Utd', abbreviation: 'SHU',
      stadium: 'Bramall Lane', reputation: 58, finances: 52,
      primaryColor: '#EE2737', secondaryColor: '#000000',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Chris Wilder',
      realPlayers: [
        { name: 'Tyrese Campbell', pos: 'ST' },
        { name: 'Callum O\'Hare', pos: 'AM' },
        { name: 'Harrison Burrows', pos: 'LB' },
        { name: 'Michael Cooper', pos: 'GK' },
      ],
    },
    {
      name: 'Derby County', shortName: 'Derby', abbreviation: 'DER',
      stadium: 'Pride Park', reputation: 55, finances: 48,
      primaryColor: '#FFFFFF', secondaryColor: '#000000',
      tactic: 'Balanced', formation: '4-3-3', managerName: 'John Eustace',
      realPlayers: [
        { name: 'Patrick Agyemang', pos: 'ST' },
        { name: 'Sam Szmodics', pos: 'AM' },
        { name: 'Eiran Cashin', pos: 'CB' },
        { name: 'Alex Mowatt', pos: 'CM' },
      ],
    },
    {
      name: 'Southampton', shortName: 'Southampton', abbreviation: 'SOU',
      stadium: "St Mary's Stadium", reputation: 56, finances: 50,
      primaryColor: '#D71920', secondaryColor: '#FFFFFF',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Will Still',
      realPlayers: [{ name: 'Cyle Larin', pos: 'ST' }],
    },
    {
      name: 'Middlesbrough', shortName: 'Boro', abbreviation: 'MID',
      stadium: 'Riverside Stadium', reputation: 54, finances: 46,
      primaryColor: '#E21C38', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Rob Edwards',
      realPlayers: [{ name: 'Will Lankshear', pos: 'ST' }],
    },
    {
      name: 'Bristol City', shortName: 'Bristol City', abbreviation: 'BRC',
      stadium: 'Ashton Gate', reputation: 50, finances: 44,
      primaryColor: '#E31B23', secondaryColor: '#FFFFFF',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Gerhard Struber',
      realPlayers: [{ name: 'Elijah Adebayo', pos: 'ST' }],
    },
    {
      name: 'Swansea City', shortName: 'Swansea', abbreviation: 'SWA',
      stadium: 'Swansea.com Stadium', reputation: 48, finances: 42,
      primaryColor: '#FFFFFF', secondaryColor: '#000000',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Alan Sheehan',
      realPlayers: [{ name: 'Lawrence Vigouroux', pos: 'GK' }],
    },
    {
      name: 'Norwich City', shortName: 'Norwich', abbreviation: 'NOR',
      stadium: 'Carrow Road', reputation: 52, finances: 46,
      primaryColor: '#FFF200', secondaryColor: '#00A650',
      tactic: 'Possession', formation: '4-2-3-1', managerName: 'Liam Manning',
      realPlayers: [{ name: 'Papa Amadou Diallo', pos: 'RW' }],
    },
    {
      name: 'Watford', shortName: 'Watford', abbreviation: 'WAT',
      stadium: 'Vicarage Road', reputation: 50, finances: 44,
      primaryColor: '#FBEE23', secondaryColor: '#ED2127',
      tactic: 'Counter', formation: '4-4-2', managerName: 'Tom Cleverley',
      realPlayers: [{ name: 'Michael Adu-Poku', pos: 'ST' }],
    },
    {
      name: 'Burnley', shortName: 'Burnley', abbreviation: 'BUR',
      stadium: 'Turf Moor', reputation: 54, finances: 48,
      primaryColor: '#6C1D45', secondaryColor: '#99D6EA',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Scott Parker',
      realPlayers: [
        { name: 'Zeki Amdouni', pos: 'ST' },
        { name: 'Max Alleyne', pos: 'CB' },
      ],
    },
    {
      name: 'Portsmouth', shortName: 'Portsmouth', abbreviation: 'POR',
      stadium: 'Fratton Park', reputation: 46, finances: 40,
      primaryColor: '#001489', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'John Mousinho',
      realPlayers: [
        { name: 'Ebou Adams', pos: 'DM' },
        { name: 'Benjamin Arthur', pos: 'CB' },
      ],
    },
    // Remaining Championship slots filled with real clubs not fully covered by search;
    // squad generated entirely.
    ...generateRemainingChampionshipClubs(),
  ],
};

// ------------------------------------------------------------
// LEAGUE ONE & LEAGUE TWO
// ------------------------------------------------------------

const LEAGUE_ONE: LeagueSeed = {
  id: 'league_l1',
  name: 'EFL League One',
  tier: 3,
  clubs: [
    {
      name: 'Huddersfield Town', shortName: 'Huddersfield', abbreviation: 'HUD',
      stadium: 'John Smith\'s Stadium', reputation: 42, finances: 36,
      primaryColor: '#00AEEF', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Michael Duff',
      realPlayers: [
        { name: 'Alfie May', pos: 'ST' },
        { name: 'Herbie Kane', pos: 'CM' },
      ],
    },
    {
      name: 'Luton Town', shortName: 'Luton', abbreviation: 'LUT',
      stadium: 'Kenilworth Road', reputation: 44, finances: 38,
      primaryColor: '#F78F1E', secondaryColor: '#FFFFFF',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Matt Bloomfield',
      realPlayers: [
        { name: 'Teden Mengi', pos: 'CB' },
        { name: 'Shayden Morris', pos: 'RW' },
      ],
    },
    {
      name: 'Leicester City', shortName: 'Leicester', abbreviation: 'LEI',
      stadium: 'King Power Stadium', reputation: 48, finances: 42,
      primaryColor: '#003090', secondaryColor: '#FDBE11',
      tactic: 'Possession', formation: '4-3-3', managerName: 'Marten de Roon',
      realPlayers: [
        { name: 'Harry Winks', pos: 'CM' },
        { name: 'Jakub Stolarczyk', pos: 'GK' },
      ],
    },
    {
      name: 'Barnsley', shortName: 'Barnsley', abbreviation: 'BAR',
      stadium: 'Oakwell', reputation: 38, finances: 32,
      primaryColor: '#D71920', secondaryColor: '#FFFFFF',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Conor Hourihane',
      realPlayers: [
        { name: 'Luca Connell', pos: 'CM' },
        { name: 'Kelechi Nwakali', pos: 'AM' },
      ],
    },
    {
      name: 'Blackpool', shortName: 'Blackpool', abbreviation: 'BLA',
      stadium: 'Bloomfield Road', reputation: 36, finances: 30,
      primaryColor: '#F68712', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Steve Bruce',
      realPlayers: [
        { name: 'Jordan Brown', pos: 'CM' },
        { name: 'Niall Ennis', pos: 'ST' },
      ],
    },
    {
      name: 'Bradford City', shortName: 'Bradford', abbreviation: 'BRA',
      stadium: 'Valley Parade', reputation: 34, finances: 28,
      primaryColor: '#FDB913', secondaryColor: '#8B1E2B',
      tactic: 'Direct', formation: '4-4-2', managerName: 'Graham Alexander',
      realPlayers: [
        { name: 'Andy Cook', pos: 'ST' },
        { name: 'Bobby Pointon', pos: 'AM' },
      ],
    },
    {
      name: 'Burton Albion', shortName: 'Burton', abbreviation: 'BUR',
      stadium: 'Pirelli Stadium', reputation: 32, finances: 26,
      primaryColor: '#F5A12D', secondaryColor: '#000000',
      tactic: 'LowBlock', formation: '4-4-2', managerName: 'Gary Bowyer',
      realPlayers: [
        { name: 'Charlie Webster', pos: 'CM' },
        { name: 'Jake Beesley', pos: 'ST' },
      ],
    },
    {
      name: 'Doncaster Rovers', shortName: 'Doncaster', abbreviation: 'DON',
      stadium: 'Eco-Power Stadium', reputation: 30, finances: 26,
      primaryColor: '#E30613', secondaryColor: '#FFFFFF',
      tactic: 'Balanced', formation: '4-3-3', managerName: 'Grant McCann',
      realPlayers: [
        { name: 'Luke Molyneux', pos: 'RW' },
        { name: 'Hakeeb Adelakun', pos: 'AM' },
      ],
    },
    ...generateRemainingLeagueOneClubs(),
  ],
};

const LEAGUE_TWO: LeagueSeed = {
  id: 'league_l2',
  name: 'EFL League Two',
  tier: 4,
  clubs: [
    {
      name: 'Grimsby Town', shortName: 'Grimsby', abbreviation: 'GRI',
      stadium: 'Blundell Park', reputation: 26, finances: 22,
      primaryColor: '#000000', secondaryColor: '#FFFFFF',
      tactic: 'Direct', formation: '4-4-2', managerName: 'David Artell',
      realPlayers: [
        { name: 'Danny Rose', pos: 'ST' },
        { name: 'Kieran Green', pos: 'CM' },
        { name: 'Jordan Davies', pos: 'CM' },
        { name: 'Christy Pym', pos: 'GK' },
      ],
    },
    {
      name: 'Fleetwood Town', shortName: 'Fleetwood', abbreviation: 'FLE',
      stadium: 'Highbury Stadium', reputation: 24, finances: 20,
      primaryColor: '#D71920', secondaryColor: '#FFFFFF',
      tactic: 'LowBlock', formation: '4-4-2', managerName: 'Pete Wild',
      realPlayers: [],
    },
    ...generateRemainingLeagueTwoClubs(),
  ],
};

// ------------------------------------------------------------
// REMAINING CLUB FILLERS (real names, generated squads)
// These are real EFL clubs; player data is fully generated.
// ------------------------------------------------------------

function generateRemainingChampionshipClubs(): ClubSeed[] {
  return [
    { name: 'Blackburn Rovers', shortName: 'Blackburn', abbreviation: 'BLB', stadium: 'Ewood Park', reputation: 46, finances: 40, primaryColor: '#009EE0', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Valérien Ismaël' },
    { name: 'Millwall', shortName: 'Millwall', abbreviation: 'MIL', stadium: 'The Den', reputation: 44, finances: 38, primaryColor: '#001D5E', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Alex Neil' },
    { name: 'Queens Park Rangers', shortName: 'QPR', abbreviation: 'QPR', stadium: 'Loftus Road', reputation: 44, finances: 38, primaryColor: '#1D5BA4', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-3-3', managerName: 'Martí Cifuentes' },
    { name: 'Cardiff City', shortName: 'Cardiff', abbreviation: 'CAR', stadium: 'Cardiff City Stadium', reputation: 42, finances: 36, primaryColor: '#0070B5', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Brian Barry-Murphy' },
    { name: 'Charlton Athletic', shortName: 'Charlton', abbreviation: 'CHA', stadium: 'The Valley', reputation: 40, finances: 34, primaryColor: '#D4021D', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Nathan Jones' },
    { name: 'Preston North End', shortName: 'Preston', abbreviation: 'PNE', stadium: 'Deepdale', reputation: 42, finances: 36, primaryColor: '#FFFFFF', secondaryColor: '#1B3A6B', tactic: 'LowBlock', formation: '5-3-2', managerName: 'Paul Heckingbottom' },
    { name: 'Stoke City', shortName: 'Stoke', abbreviation: 'STK', stadium: 'bet365 Stadium', reputation: 46, finances: 40, primaryColor: '#E03A3E', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Mark Robins' },
    { name: 'West Bromwich Albion', shortName: 'West Brom', abbreviation: 'WBA', stadium: 'The Hawthorns', reputation: 48, finances: 42, primaryColor: '#122F67', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Tony Mowbray' },
  ];
}

function generateRemainingLeagueOneClubs(): ClubSeed[] {
  return [
    { name: 'AFC Wimbledon', shortName: 'Wimbledon', abbreviation: 'WIM', stadium: 'Plough Lane', reputation: 30, finances: 26, primaryColor: '#1D3C6E', secondaryColor: '#F5D313', tactic: 'Direct', formation: '4-4-2', managerName: 'Johnnie Jackson' },
    { name: 'Cambridge United', shortName: 'Cambridge', abbreviation: 'CAM', stadium: 'Abbey Stadium', reputation: 28, finances: 24, primaryColor: '#F5A12D', secondaryColor: '#000000', tactic: 'LowBlock', formation: '4-4-2', managerName: 'Neil Harris' },
    { name: 'Leyton Orient', shortName: 'Leyton Orient', abbreviation: 'LEY', stadium: 'Brisbane Road', reputation: 30, finances: 26, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Richie Wellens' },
    { name: 'Reading', shortName: 'Reading', abbreviation: 'REA', stadium: 'Select Car Leasing Stadium', reputation: 34, finances: 28, primaryColor: '#004494', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Noel Hunt' },
    { name: 'Wigan Athletic', shortName: 'Wigan', abbreviation: 'WIG', stadium: 'DW Stadium', reputation: 32, finances: 26, primaryColor: '#0033A0', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Shaun Maloney' },
    { name: 'Stevenage', shortName: 'Stevenage', abbreviation: 'STE', stadium: 'Lamex Stadium', reputation: 26, finances: 22, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '5-3-2', managerName: 'Alex Revell' },
    { name: 'Mansfield Town', shortName: 'Mansfield', abbreviation: 'MAN', stadium: 'Field Mill', reputation: 26, finances: 22, primaryColor: '#F5D313', secondaryColor: '#1D3C6E', tactic: 'Direct', formation: '4-4-2', managerName: 'Nigel Clough' },
    { name: 'Plymouth Argyle', shortName: 'Plymouth', abbreviation: 'PLY', stadium: 'Home Park', reputation: 32, finances: 26, primaryColor: '#007B5F', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Miron Muslic' },
  ];
}

function generateRemainingLeagueTwoClubs(): ClubSeed[] {
  return [
    { name: 'Accrington Stanley', shortName: 'Accrington', abbreviation: 'ACC', stadium: 'Wham Stadium', reputation: 22, finances: 18, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '4-4-2', managerName: 'John Doolan' },
    { name: 'Barrow', shortName: 'Barrow', abbreviation: 'BRW', stadium: 'Holker Street', reputation: 22, finances: 18, primaryColor: '#004B8D', secondaryColor: '#FFFFFF', tactic: 'Direct', formation: '4-4-2', managerName: 'Andy Whing' },
    { name: 'Bromley', shortName: 'Bromley', abbreviation: 'BRO', stadium: 'Hayes Lane', reputation: 20, finances: 16, primaryColor: '#000000', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-3-3', managerName: 'Andy Woodman' },
    { name: 'Carlisle United', shortName: 'Carlisle', abbreviation: 'CRL', stadium: 'Brunton Park', reputation: 24, finances: 20, primaryColor: '#0033A0', secondaryColor: '#FFFFFF', tactic: 'LowBlock', formation: '5-3-2', managerName: 'Paul Simpson' },
    { name: 'Cheltenham Town', shortName: 'Cheltenham', abbreviation: 'CHL', stadium: 'Whaddon Road', reputation: 22, finances: 18, primaryColor: '#E30613', secondaryColor: '#FFFFFF', tactic: 'Balanced', formation: '4-4-2', managerName: 'Michael Flynn' },
    { name: 'Colchester United', shortName: 'Colchester', abbreviation: 'COL', stadium: 'JobServe Community Stadium', reputation: 22, finances: 18, primaryColor: '#004B8D', secondaryColor: '#FFFFFF', tactic: 'Possession', formation: '4-2-3-1', managerName: 'Danny Cowley' },
    { name: 'Crewe Alexandra', shortName: 'Crewe', abbreviation: 'CRE', stadium: 'Gresty Road', reputation: 20, finances: 16, primaryColor: '#
