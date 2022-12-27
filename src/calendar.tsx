import * as React from "react";
import ReactCalendarHeatmap from "react-calendar-heatmap";
import { MAX_COLORS, COLOR_FREQ } from "./constants";

interface HeatmapProps {
    data: any[];
}

const getColorLevel = (count: number, target: number) => {
    if (count < target && count > 0){
        return 1;
    }

    if (count >= target){
        return 4
    }

    return 0;
}

class Heatmap extends React.Component<HeatmapProps> {
    render() {
        const element = document.getElementById("color-elem");
        if (element) {
            const base = getComputedStyle(element).getPropertyValue("color");
            for (let elem of Array.from(document.getElementsByClassName("color1") as HTMLCollectionOf<HTMLElement>)) {
                elem.style.fill = base;
                elem.style.opacity = "0.2";
            }
            for (let elem of Array.from(document.getElementsByClassName("color2") as HTMLCollectionOf<HTMLElement>)) {
                elem.style.fill = base;
                elem.style.opacity = "0.6";
            }
            for (let elem of Array.from(document.getElementsByClassName("color3") as HTMLCollectionOf<HTMLElement>)) {
                elem.style.fill = base;
                elem.style.opacity = "0.76";
            }
            for (let elem of Array.from(document.getElementsByClassName("color4") as HTMLCollectionOf<HTMLElement>)) {
                elem.style.fill = base;
                elem.style.opacity = "0.92";
            }
            for (let elem of Array.from(document.getElementsByClassName("color5") as HTMLCollectionOf<HTMLElement>)) {
                elem.style.fill = base;
                elem.style.opacity = "1";
            }
        }
        return <div style={{ padding: "10px 0px 0px 10px", maxWidth: "300px", marginLeft: "auto", marginRight: "auto", fontSize: "4px !important" }} id="calendar-container">
            <ReactCalendarHeatmap
                startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
                endDate={new Date()}
                values={this.props.data}
                horizontal={false}
                showMonthLabels={true}
                showWeekdayLabels={true}
                weekdayLabels={["S", "M", "T", "W", "T", "F", "S"]}
                classForValue={(value) => {
                    if (!value || value.count == 0) {
                        return 'color-empty';
                    }
        
                    return `color-scale-${getColorLevel(value.count, value.target)}`;
                }}
                onClick = {(value) => alert(`you have written ${value.count} words on ${new Date(value.date).toLocaleDateString()}! You have ${Math.max(value.target - value.count, 0)} to go.`)}
                titleForValue={(value) => !value || value.date === null ? '' : value.count + ' words on ' + new Date(value.date).toLocaleDateString()}
            />
            <div id="color-elem" />
        </div>
    }

}

export default Heatmap;
