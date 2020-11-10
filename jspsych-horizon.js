jsPsych.plugins["horizon"] = (function () {

    var plugin = {};

    plugin.info = {
        name: "horizon",
        parameters: {
            forced: {
                type: jsPsych.plugins.parameterType.INT, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
                array: true,
                default: undefined,
                description: 'Array which describes which bandit may be selected (0=either, 1=left, 2=right)'
            },
            rewards: {
                type: jsPsych.plugins.parameterType.INT,
                array: true,
                default: undefined,
                description: 'Rewards for each bandit.  [[bandit 1 rewards], [bandit 2 rewards]]'
            },
            choices: {
                type: jsPsych.plugins.parameterType.KEYCODE,
                array: true,
                default: [
                    jsPsych.pluginAPI.convertKeyCharacterToKeyCode(','),
                    jsPsych.pluginAPI.convertKeyCharacterToKeyCode('.')
                ],
                description: 'Response keys for selecting bandit.'
            }
        }
    }

    plugin.trial = function (display_element, trial) {

        let processing = false;
        let forced = trial.forced;
        let rewards = trial.rewards;
        let display = [[], []];
        let responses = [];

        let size = 50;
        let stacksize = forced.length;
        let yPos = [...Array(stacksize).keys()];

        let after_response = function (info) {
            // process key response
            if (jsPsych.pluginAPI.compareKeys(info.key, trial.choices[0])) {
                if (forced[active_row] !== 2 && !processing) {
                    processing = true;
                    responses.push('left');
                    display[0].push(rewards[0][active_row]);
                    display[1].push('XX')
                    next_trial();
                }
            } else if (jsPsych.pluginAPI.compareKeys(info.key, trial.choices[1])) {
                if (forced[active_row] !== 1 && !processing) {
                    processing = true;
                    responses.push('right');
                    display[1].push(rewards[1][active_row]);
                    display[0].push('XX')
                    next_trial();
                }
            }

        }
        // function to end trial when it is time
        var end_trial = function () {

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // kill keyboard listeners
            if (typeof keyboardListener !== 'undefined') {
                jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
            }

            // Prepare output variables
            let scores = [];
            let a = [];
            for(let i=0; i<forced.length; i++){
                if(responses[i]==='left'){
                    scores.push(rewards[0][i]);
                    a.push(1);
                } else {
                    scores.push(rewards[1][i]);
                    a.push(2);
                }
            }

            // Use with Array.reduce() to sum elements of an array.
            let sum = function(total, num){
                return total + num;
            }

            // gather the data to store for the trial
            var trial_data = {
                "responses": responses,
                "rewards": trial.rewards,
                "scores": scores,
                "sum_scores": scores.reduce(sum),
                "a": a
            };

            // After a 1-s delay, clear display and move on.
            jsPsych.pluginAPI.setTimeout(function(){
                // clear the display
                display_element.innerHTML = '';

                // move on to the next trial
                jsPsych.finishTrial(trial_data);
            }, 1000);
        };

        var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
            callback_function: after_response,
            valid_responses: trial.choices,
            rt_method: 'performance',
            persist: true,
            allow_held_key: false
        });


        display_element.innerHTML = '<div id="horizon-container"></div>'

        // make svg container
        let svg = d3.select('#horizon-container').append('svg')
            .attr('width', 800)
            .attr('height', 800);

        let active_row = 0; // which row is active
        let yOffset = 20;
        let xOffset = [300, 500];

        let create_bandits = function () {
            svg.selectAll('rect')
                .data(d3.cross(xOffset, yPos))
                .enter().append('rect')
                .attr('x', d => d[0])
                .attr('y', d => d[1] * size)
                .attr('height', size)
                .attr('width', size)
                .attr('class', function (d, i) {
                    if (Math.floor(i / yPos.length) === 0) {
                        return 'bandit-block bandit-left';
                    } else {
                        return 'bandit-block bandit-right';
                    }
                })
                // set id to be block-[col]-[row]
                .attr('id', function (d, i) {
                    return 'block-' + Math.floor(i / yPos.length) + '-' + d[1];
                });
        }
        create_bandits();

        let create_bandit_arms = function () {
            let sides = ['left', 'right'];
            let x1 = [xOffset[0], xOffset[1] + size];
            let x2 = [xOffset[0] - size, xOffset[1] + 2 * size];

            for (let i = 0; i <= 1; i++) {
                let line = svg.append('line')
                    .attr('x1', x1[i])
                    .attr('x2', x2[i])
                    .attr('y1', (yOffset + 2.5 * size))
                    .attr('y2', (yOffset + 1.5 * size))
                    .attr('class', 'bandit-arm bandit-' + sides[i])
                    .attr('id', 'bandit-arm-' + sides[i]);
                svg.append('circle')
                    .attr('cy', function () {
                        return line.attr('y2');
                    })
                    .attr('cx', function () {
                        return line.attr('x2');
                    })
                    .attr('r', 4)
                    .attr('class', 'bandit-ball bandit-' + sides[i])
                    .attr('id', 'bandit-ball-' + sides[i]);
            }
        }
        create_bandit_arms();

        let animate_arm = function () {
            let side = responses[responses.length - 1];
            let arm = d3.select('#bandit-arm-' + side);
            let oldy2 = parseFloat(arm.attr('y2'));
            arm.transition()
                .attr('y2', (oldy2 + 2 * size))
                .attr('cy', (oldy2 + 2 * size))
                .delay(0)
                .duration(250)
                .on('end', function () {
                    d3.select(this)
                        .transition()
                        .attr('y2', oldy2)
                        .attr('cy', oldy2)
                        .delay(0)
                        .duration(250)
                });
            let ball = d3.select('#bandit-ball-' + side);
            ball.transition()
                .attr('cy', (oldy2 + 2 * size))
                .delay(0)
                .duration(250)
                .on('end', function () {
                    d3.select(this)
                        .transition()
                        .attr('cy', oldy2)
                        .delay(0)
                        .duration(250)
                });
        }

        let next_trial = function () {
            clear_choices();
            animate_arm();
            jsPsych.pluginAPI.setTimeout(function () {
                active_row += 1;
                update_text();
            }, 250);
            jsPsych.pluginAPI.setTimeout(function () {
                display_choices();
                processing = false;
            }, 500);

            jsPsych.pluginAPI.setTimeout(function(){
                if(active_row === forced.length){
                    end_trial()
                }
            }, 1000);
        }

        let update_text = function () {
            svg.selectAll('g.rewardtext-group').remove();

            svg.selectAll('g.rewardtext-group')
                .data(display)
                .enter()
                .append('g')
                .attr('class', 'rewardtext-group')
                .attr('transform', function (d, i) {
                    return 'translate(' + (xOffset[i] + size / 2) + ')'
                })
                .selectAll('text')
                .data(function (d) {
                    return d;
                })
                .enter().append('text')
                .attr('x', 0)
                .attr('y', function (d, i) {
                    return yPos[i] * size + size / 2;
                })
                .text(function (d, i) {
                    return d;
                })
                .attr('class', 'rewardtext');
        }

        // Highlight the available choices
        let display_choices = function () {
            let side;
            if (forced[active_row] === 0) {
                side = [0, 1];
            } else {
                side = [forced[active_row] - 1];
            }

            for (let i = 0; i < side.length; i++) {
                d3.select('#block-' + side[i] + '-' + active_row)
                    .classed('block-choices', true);
            }
        }

        // Highlight the choices for the first trial
        display_choices();

        // Remove the highlight from all blocks
        let clear_choices = function () {
            d3.selectAll('.bandit-block')
                .classed('block-choices', false);
        }



    };

    return plugin;
})();
