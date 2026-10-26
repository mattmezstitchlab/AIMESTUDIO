import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server.browser';
import {OperaTicket} from './src/components/tickets/Show';
export function renderTicket(personnalisation:Record<string,string>){return renderToStaticMarkup(<OperaTicket personnalisation={personnalisation}/>)}
