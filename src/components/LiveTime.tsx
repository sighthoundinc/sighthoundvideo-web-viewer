/******************************************************************************
  *
   *
 * Copyright 2013-2022 Sighthound, Inc.
 *
 * Licensed under the GNU GPLv3 license found at
 * https://www.gnu.org/licenses/gpl-3.0.txt
 *
 * Alternative licensing available from Sighthound, Inc.
 * by emailing opensource@sighthound.com
 *
 * This file is part of the Sighthound Video project which can be found at
 * https://github.com/sighthoundinc/SighthoundVideo
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; using version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02111, USA.
 *
  *
*******************************************************************************/

import * as React from 'react';
import fecha from 'fecha';

interface LiveTimeProps {
    formatString: string;
}

interface LiveTimeState {
    currentTime: number;
}

class LiveTime extends React.Component<LiveTimeProps, LiveTimeState> {
    interval: number;

    componentDidMount() {
        this.interval = window.setInterval(this.updateClock.bind(this), 1000);
    }

    componentWillUnmount() {
        window.clearInterval(this.interval);
    }

    updateClock() {
        this.setState({
            currentTime: Date.now()
        });
    }

    render() {
        return (
            <div id="liveTime" className="date">
                {fecha.format(Date.now(), this.props.formatString)}
            </div>
        );
    }
}

export default LiveTime;
